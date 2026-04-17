using System.Diagnostics;
using Microsoft.Extensions.Logging;

namespace Music.Infrastructure.Utils;

public static class ExternalRunner
{
    public static async Task<bool> RunAsync(
        ILogger logger,
        string progress,
        IReadOnlyList<string> arguments,
        string inputPath,
        string outputPath,
        string toolName,
        CancellationToken cancellationToken,
        string? workingDirectory = null)
    {
        ProcessStartInfo psi = new()
        {
            FileName = progress,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false,
            CreateNoWindow = true
        };

        if (!string.IsNullOrWhiteSpace(workingDirectory))
        {
            psi.WorkingDirectory = workingDirectory;
        }

        foreach (string arg in arguments)
        {
            psi.ArgumentList.Add(arg);
        }

        using Process process = new()
        {
            StartInfo = psi,
            EnableRaisingEvents = true
        };

        try
        {
            if (!process.Start())
            {
                logger.LogError("Failed to start {ToolName} for {InputPath}", toolName, inputPath);
                return false;
            }
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to start {ToolName} for {InputPath}", toolName, inputPath);
            return false;
        }

        using CancellationTokenRegistration cancellationRegistration = cancellationToken.Register(() =>
        {
            try
            {
                if (!process.HasExited)
                {
                    process.Kill(entireProcessTree: true);
                }
            }
            catch
            {
            }
        });

        Task<string> stdoutTask = process.StandardOutput.ReadToEndAsync(cancellationToken);
        Task<string> stderrTask = process.StandardError.ReadToEndAsync(cancellationToken);

        await process.WaitForExitAsync(cancellationToken);

        string stdout = await stdoutTask;
        string stderr = await stderrTask;

        if (process.ExitCode != 0)
        {
            logger.LogError(
                "{ToolName} failed for {InputPath} -> {OutputPath} (exit {ExitCode}): {Error}",
                toolName,
                inputPath,
                outputPath,
                process.ExitCode,
                string.IsNullOrWhiteSpace(stderr) ? stdout : stderr);

            return false;
        }

        logger.LogInformation(
            "{ToolName} succeeded for {InputPath} -> {OutputPath}",
            toolName,
            inputPath,
            outputPath);

        return true;
    }
}
