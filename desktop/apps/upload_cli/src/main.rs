use std::{env, time::Instant};

use indicatif::{ProgressBar, ProgressStyle};
use upload::{UploadClient, UploadClientConfig};

fn build_client(args: &[String]) -> Result<UploadClient, String> {
    if args.len() != 7 {
        return Err(
            "Usage: upload_cli <token> <blake3_hash> <file_object_id> <init_request_url> <complete_url> <file_path>"
                .to_string(),
        );
    }

    let token = args[1].clone();
    let blake3_hash = args[2].clone();
    let file_object_id = args[3].clone();
    let init_request_url = args[4].clone();
    let complete_url = args[5].clone();
    let file_path = args[6].clone();

    Ok(UploadClient::new(UploadClientConfig {
        token,
        blake3_hash,
        init_request_url,
        complete_url,
        file_object_id,
        file_path,
    }))
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let args: Vec<String> = env::args().collect();
    let client = build_client(&args).map_err(std::io::Error::other)?;
    let started_at = Instant::now();
    let progress_bar = ProgressBar::new(0);

    progress_bar.set_style(
        ProgressStyle::with_template(
            "{spinner:.green} [{bar:40.cyan/blue}] {percent:>3}% {bytes}/{total_bytes} {msg}",
        )?
        .progress_chars("=>-"),
    );

    let completed_upload = client
        .run_with_progress({
            let progress_bar = progress_bar.clone();

            move |progress| {
                progress_bar.set_length(progress.total_bytes);
                progress_bar.set_position(progress.uploaded_bytes);
                progress_bar.set_message(format!(
                    "{} / {} parts",
                    progress.uploaded_parts, progress.total_parts
                ));
            }
        })
        .await?;

    progress_bar.finish_with_message("upload complete");

    println!(
        "Upload completed successfully in {:.2}s (upload_id: {}, parts: {})",
        started_at.elapsed().as_secs_f64(),
        completed_upload.upload_id,
        completed_upload.parts.len()
    );

    Ok(())
}
