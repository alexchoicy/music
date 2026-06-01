using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Music.Core.Services.Languages;

namespace Music.Api.Controllers;

[ApiController]
[Route("languages")]
public class LanguageController(ILanguageService languageService) : ControllerBase
{
    private readonly ILanguageService _languageService = languageService;

    [HttpGet]
    [Authorize]
    [Produces("application/json")]
    [ProducesResponseType(typeof(IReadOnlyList<LanguageListItem>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAll(CancellationToken cancellationToken)
    {
        IReadOnlyList<LanguageListItem> languages = await _languageService.GetAllAsync(
            cancellationToken
        );
        return Ok(languages);
    }
}
