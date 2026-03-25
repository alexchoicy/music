use clap::{Parser, Subcommand};
use indicatif::{ProgressBar, ProgressStyle};
use std::{io, path::PathBuf, time::Instant};
use upload::{UploadClient, UploadClientConfig};

#[derive(Debug, Parser)]
#[command(name = "upload_cli", version, about = "Upload one or more files")]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Debug, Subcommand)]
enum Commands {
    #[command(arg_required_else_help = true)]
    Single {
        base_url: String,
        token: String,
        file_object_id: String,
        blake3_hash: String,
        file_path: String,
    },
    Multiple {
        json_path: PathBuf,
    },
}

async fn run_client(client: UploadClient) -> Result<(), Box<dyn std::error::Error>> {
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

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let args = Cli::parse();

    match args.command {
        Commands::Single {
            base_url,
            token,
            file_object_id,
            blake3_hash,
            file_path,
        } => {
            let client = UploadClient::new(UploadClientConfig {
                token,
                blake3_hash,
                base_url,
                file_object_id,
                file_path,
            });

            run_client(client).await?;
        }
        Commands::Multiple { json_path: _ } => {
            return Err(io::Error::other("multiple mode is not supported yet").into());
        }
    }

    Ok(())
}
