use std::{
    fs::File,
    io::{Read, Seek, SeekFrom},
    time::Duration,
};

use blake3::Hasher;
use serde::{Deserialize, Serialize};
use thiserror::Error;
use tokio::task::JoinSet;
use tokio::time::sleep;

pub struct UploadClientConfig {
    pub token: String,
    pub blake3_hash: String,
    pub base_url: String,
    pub file_object_id: String,
    pub file_path: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MultipartUploadPartInfo {
    pub part_number: i32,
    pub url: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MultipartUploadInfo {
    pub upload_id: String,
    pub part_size_in_bytes: i64,
    pub parts: Vec<MultipartUploadPartInfo>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CompleteMultipartUploadPart {
    pub part_number: i32,
    pub etag: String,
}

#[derive(Debug, Clone)]
pub struct CompletedMultipartUpload {
    pub upload_id: String,
    pub parts: Vec<CompleteMultipartUploadPart>,
}

#[derive(Debug, Clone, Copy)]
pub struct UploadProgress {
    pub uploaded_parts: usize,
    pub total_parts: usize,
    pub uploaded_bytes: u64,
    pub total_bytes: u64,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct CompleteMultipartUploadRequest {
    blake3_id: String,
    upload_id: String,
    parts: Vec<CompleteMultipartUploadPart>,
}

pub struct UploadClient {
    config: UploadClientConfig,
    client: reqwest::Client,
}

const SAMPLE_SIZE: u64 = 5 * 1024 * 1024;
const MAX_CONCURRENT_UPLOADS: usize = 20;
const MAX_PART_UPLOAD_ATTEMPTS: u32 = 3;
const PART_UPLOAD_RETRY_BASE_DELAY_MS: u64 = 500;
const BUFFER_SIZE: usize = 256 * 1024;

#[derive(Debug, Error)]
pub enum UploadError {
    #[error("failed to read file: {0}")]
    Io(#[from] std::io::Error),
    #[error("request failed: {0}")]
    Request(#[from] reqwest::Error),
    #[error("upload task failed: {0}")]
    TaskJoin(#[from] tokio::task::JoinError),
    #[error("blake3 hash mismatch: expected {expected}, got {actual}")]
    HashMismatch { expected: String, actual: String },
    #[error("invalid multipart part size: {0}")]
    InvalidPartSize(i64),
    #[error("invalid multipart part number: {0}")]
    InvalidPartNumber(i32),
    #[error("multipart part {part_number} starts at byte {offset}, outside file size {file_size}")]
    PartOffsetOutOfRange {
        part_number: i32,
        offset: u64,
        file_size: u64,
    },
    #[error("multipart part {part_number} offset overflowed for part size {part_size}")]
    PartOffsetOverflow { part_number: i32, part_size: u64 },
    #[error("multipart part {part_number} requires {size} bytes, which exceeds platform limits")]
    PartTooLarge { part_number: i32, size: u64 },
    #[error("failed to initialize multipart upload ({status}): {body}")]
    InitMultipartUpload {
        status: reqwest::StatusCode,
        body: String,
    },
    #[error("failed to upload part {part_number} ({status}): {body}")]
    UploadPart {
        part_number: i32,
        status: reqwest::StatusCode,
        body: String,
    },
    #[error("failed to upload part {part_number} after {attempts} attempts: {source}")]
    UploadPartRequest {
        part_number: i32,
        attempts: u32,
        #[source]
        source: reqwest::Error,
    },
    #[error("missing ETag header in successful upload response for part {part_number}")]
    MissingETag { part_number: i32 },
    #[error("invalid ETag header in successful upload response for part {part_number}: {source}")]
    InvalidETag {
        part_number: i32,
        #[source]
        source: http::header::ToStrError,
    },
    #[error("failed to complete multipart upload ({status}): {body}")]
    CompleteMultipartUpload {
        status: reqwest::StatusCode,
        body: String,
    },
}

pub type UploadResult<T> = Result<T, UploadError>;

impl UploadClient {
    pub fn new(args: UploadClientConfig) -> Self {
        Self {
            config: args,
            client: reqwest::Client::new(),
        }
    }

    pub async fn run(&self) -> UploadResult<CompletedMultipartUpload> {
        self.run_with_progress(|_| {}).await
    }

    pub async fn run_with_progress<F>(
        &self,
        mut on_progress: F,
    ) -> UploadResult<CompletedMultipartUpload>
    where
        F: FnMut(UploadProgress),
    {
        let mut src_file = File::open(&self.config.file_path)?;
        let file_size = src_file.metadata()?.len();
        let blake3_hash = get_simple_blake3_hash(&mut src_file)?;

        println!("File size: {file_size} bytes");
        println!(
            "Blake3 hash: {blake3_hash} (expected {})",
            self.config.blake3_hash
        );

        if blake3_hash != self.config.blake3_hash {
            return Err(UploadError::HashMismatch {
                expected: self.config.blake3_hash.clone(),
                actual: blake3_hash,
            });
        }

        let upload_info = self.init_multipart_upload().await?;
        let total_parts = upload_info.parts.len();
        let part_size = u64::try_from(upload_info.part_size_in_bytes)
            .map_err(|_| UploadError::InvalidPartSize(upload_info.part_size_in_bytes))?;

        if part_size == 0 {
            return Err(UploadError::InvalidPartSize(upload_info.part_size_in_bytes));
        }

        on_progress(UploadProgress {
            uploaded_parts: 0,
            total_parts,
            uploaded_bytes: 0,
            total_bytes: file_size,
        });

        let upload_id = upload_info.upload_id.clone();
        let mut uploads = JoinSet::new();
        let mut completed_parts = Vec::with_capacity(total_parts);
        let mut uploaded_bytes = 0_u64;

        for part_info in upload_info.parts {
            let client = self.client.clone();
            let file_path = self.config.file_path.clone();

            uploads.spawn(async move {
                upload_part(client, file_path, file_size, part_size, part_info).await
            });

            if uploads.len() >= MAX_CONCURRENT_UPLOADS {
                if let Some(result) = uploads.join_next().await {
                    let completed_part = result??;
                    uploaded_bytes += part_len(file_size, part_size, completed_part.part_number)?;
                    completed_parts.push(completed_part);
                    on_progress(UploadProgress {
                        uploaded_parts: completed_parts.len(),
                        total_parts,
                        uploaded_bytes,
                        total_bytes: file_size,
                    });
                }
            }
        }

        while let Some(result) = uploads.join_next().await {
            let completed_part = result??;
            uploaded_bytes += part_len(file_size, part_size, completed_part.part_number)?;
            completed_parts.push(completed_part);
            on_progress(UploadProgress {
                uploaded_parts: completed_parts.len(),
                total_parts,
                uploaded_bytes,
                total_bytes: file_size,
            });
        }

        completed_parts.sort_by_key(|part| part.part_number);

        let completed_upload = CompletedMultipartUpload {
            upload_id,
            parts: completed_parts,
        };

        self.complete_multipart_upload(&completed_upload).await?;

        Ok(completed_upload)
    }

    async fn init_multipart_upload(&self) -> UploadResult<MultipartUploadInfo> {
        let response = self
            .client
            .get(join_url(
                &self.config.base_url,
                &format!("/files/{}/init", &self.config.file_object_id),
            ))
            .bearer_auth(&self.config.token)
            .json(&serde_json::json!({
                "file_object_id": self.config.file_object_id,
                "blake3_hash": self.config.blake3_hash,
            }))
            .send()
            .await?;

        if !response.status().is_success() {
            let status = response.status();
            let body = response.text().await.unwrap_or_default();

            return Err(UploadError::InitMultipartUpload { status, body });
        }

        Ok(response.json::<MultipartUploadInfo>().await?)
    }

    async fn complete_multipart_upload(
        &self,
        completed_upload: &CompletedMultipartUpload,
    ) -> UploadResult<()> {
        let response = self
            .client
            .post(join_url(
                &self.config.base_url,
                &format!("/uploads/concert/complete-multipart"),
            ))
            .bearer_auth(&self.config.token)
            .json(&CompleteMultipartUploadRequest {
                blake3_id: self.config.blake3_hash.clone(),
                upload_id: completed_upload.upload_id.clone(),
                parts: completed_upload.parts.clone(),
            })
            .send()
            .await?;

        if !response.status().is_success() {
            let status = response.status();
            let body = response.text().await.unwrap_or_default();

            return Err(UploadError::CompleteMultipartUpload { status, body });
        }

        Ok(())
    }
}

fn join_url(base_url: &str, path: &str) -> String {
    format!(
        "{}/{}",
        base_url.trim_end_matches('/'),
        path.trim_start_matches('/')
    )
}

async fn upload_part(
    client: reqwest::Client,
    file_path: String,
    file_size: u64,
    part_size: u64,
    part_info: MultipartUploadPartInfo,
) -> UploadResult<CompleteMultipartUploadPart> {
    let part_number = part_info.part_number;
    let url = part_info.url;

    for attempt in 1..=MAX_PART_UPLOAD_ATTEMPTS {
        let file_path = file_path.clone();
        let buffer = tokio::task::spawn_blocking(move || {
            read_part(&file_path, file_size, part_size, part_number)
        })
        .await??;

        match client.put(&url).body(buffer).send().await {
            Ok(response) => {
                if response.status().is_success() {
                    let etag = response
                        .headers()
                        .get(reqwest::header::ETAG)
                        .ok_or(UploadError::MissingETag { part_number })?
                        .to_str()
                        .map_err(|source| UploadError::InvalidETag {
                            part_number,
                            source,
                        })?
                        .to_owned();

                    return Ok(CompleteMultipartUploadPart { part_number, etag });
                }

                let status = response.status();
                let body = response.text().await.unwrap_or_default();

                if attempt < MAX_PART_UPLOAD_ATTEMPTS && is_retryable_status(status) {
                    eprintln!(
                        "retrying part {} after attempt {} failed with status {}",
                        part_number, attempt, status
                    );
                    sleep(retry_delay(attempt)).await;
                    continue;
                }

                return Err(UploadError::UploadPart {
                    part_number,
                    status,
                    body,
                });
            }
            Err(error) => {
                if attempt < MAX_PART_UPLOAD_ATTEMPTS && is_retryable_request_error(&error) {
                    eprintln!(
                        "retrying part {} after attempt {} failed: {}",
                        part_number, attempt, error
                    );
                    sleep(retry_delay(attempt)).await;
                    continue;
                }

                return Err(UploadError::UploadPartRequest {
                    part_number,
                    attempts: attempt,
                    source: error,
                });
            }
        }
    }

    unreachable!("upload attempts should always return or continue")
}

fn is_retryable_status(status: reqwest::StatusCode) -> bool {
    status.is_server_error()
        || status == reqwest::StatusCode::REQUEST_TIMEOUT
        || status == reqwest::StatusCode::TOO_MANY_REQUESTS
}

fn is_retryable_request_error(error: &reqwest::Error) -> bool {
    error.is_timeout() || error.is_connect()
}

fn retry_delay(attempt: u32) -> Duration {
    Duration::from_millis(PART_UPLOAD_RETRY_BASE_DELAY_MS * (1_u64 << (attempt - 1)))
}

fn part_len(file_size: u64, part_size: u64, part_number: i32) -> UploadResult<u64> {
    let part_number_u64 = u64::try_from(part_number)
        .ok()
        .filter(|part_number| *part_number >= 1)
        .ok_or(UploadError::InvalidPartNumber(part_number))?;
    let offset =
        (part_number_u64 - 1)
            .checked_mul(part_size)
            .ok_or(UploadError::PartOffsetOverflow {
                part_number,
                part_size,
            })?;

    if offset >= file_size && file_size != 0 {
        return Err(UploadError::PartOffsetOutOfRange {
            part_number,
            offset,
            file_size,
        });
    }

    Ok(std::cmp::min(part_size, file_size.saturating_sub(offset)))
}

fn read_part(
    file_path: &str,
    file_size: u64,
    part_size: u64,
    part_number: i32,
) -> UploadResult<Vec<u8>> {
    let part_number_u64 = u64::try_from(part_number)
        .ok()
        .filter(|part_number| *part_number >= 1)
        .ok_or(UploadError::InvalidPartNumber(part_number))?;
    let offset =
        (part_number_u64 - 1)
            .checked_mul(part_size)
            .ok_or(UploadError::PartOffsetOverflow {
                part_number,
                part_size,
            })?;

    if offset >= file_size && file_size != 0 {
        return Err(UploadError::PartOffsetOutOfRange {
            part_number,
            offset,
            file_size,
        });
    }

    let size = std::cmp::min(part_size, file_size.saturating_sub(offset));
    let buffer_len =
        usize::try_from(size).map_err(|_| UploadError::PartTooLarge { part_number, size })?;

    let mut file = File::open(file_path)?;
    file.seek(SeekFrom::Start(offset))?;

    let mut buffer = vec![0u8; buffer_len];
    file.read_exact(&mut buffer)?;

    Ok(buffer)
}

pub fn get_simple_blake3_hash(file: &mut File) -> UploadResult<String> {
    let file_size = file.metadata()?.len();

    let mut hasher = Hasher::new();

    if file_size <= SAMPLE_SIZE * 2 {
        std::io::copy(file, &mut hasher)?;

        return Ok(hasher.finalize().to_hex().to_string());
    }

    read_chunk(file, &mut hasher, SAMPLE_SIZE)?;

    file.seek(SeekFrom::Start(file_size - SAMPLE_SIZE))?;

    read_chunk(file, &mut hasher, SAMPLE_SIZE)?;

    Ok(hasher.finalize().to_hex().to_string())
}

fn read_chunk(file: &mut File, hasher: &mut Hasher, limit: u64) -> std::io::Result<()> {
    let mut buffer = [0u8; BUFFER_SIZE];
    let mut total_read = 0;

    while total_read < limit {
        let to_read = std::cmp::min(buffer.len() as u64, limit - total_read);
        let bytes_read = file.read(&mut buffer[..to_read as usize])?;

        if bytes_read == 0 {
            break;
        }

        hasher.update(&buffer[..bytes_read]);
        total_read += bytes_read as u64;
    }

    Ok(())
}
