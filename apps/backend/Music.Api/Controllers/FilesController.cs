using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Music.Core.Constants;
using Music.Core.Models;
using Music.Core.Services.Interfaces;

namespace Music.Api.Controllers;

[ApiController]
[Route("files")]
public sealed class FilesController(IFileUrlService fileUrlService) : ControllerBase
{
    private readonly IFileUrlService _fileUrlService = fileUrlService;

    [HttpGet("{id:guid}")]
    [Authorize]
    [ProducesResponseType(typeof(string), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetUrl(
        [FromRoute][Required] Guid id,
        CancellationToken cancellationToken)
    {
        string url = await _fileUrlService.GetFilePlayUrlAsync(id, cancellationToken);
        return Ok(url);
    }

    [HttpGet("{id:guid}/play")]
    [Authorize]
    [ProducesResponseType(StatusCodes.Status302Found)]
    public async Task<IActionResult> Play(
        [FromRoute][Required] Guid id,
        CancellationToken cancellationToken)
    {
        string url = await _fileUrlService.GetFilePlayUrlAsync(id, cancellationToken);
        return Redirect(url);
    }

    [HttpGet("{id:guid}/init")]
    [Authorize(AuthorizationPolicies.UploadAllowed)]
    [ProducesResponseType(typeof(MultipartUploadInfo), StatusCodes.Status200OK)]
    public async Task<IActionResult> InitUpload([FromRoute][Required] Guid id,
    CancellationToken cancellationToken)
    {
        MultipartUploadInfo uploadContent = await _fileUrlService.InitUploadAsync(id, cancellationToken);
        return Ok(uploadContent);
    }
}
