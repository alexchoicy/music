using System.ComponentModel.DataAnnotations;
using Microsoft.EntityFrameworkCore;
using Music.Core.Common.Exceptions;
using Music.Core.Entities;
using Music.Core.Services.Parties;
using Music.Core.Services.Parties.Requests;
using Music.Core.Services.Parties.Results;
using Music.Core.Storage;
using Music.Infrastructure.Data;
using Music.Infrastructure.Mappers;

namespace Music.Infrastructure.Services.Party;

public sealed class PartyRelationshipService(AppDbContext dbContext, IAssetsService assetsService)
    : IPartyRelationshipService
{
    public async Task<PartyRelationshipGraph> GetGraphAsync(
        int partyId,
        CancellationToken cancellationToken = default
    )
    {
        if (!await dbContext.Parties.AnyAsync(party => party.Id == partyId, cancellationToken))
        {
            throw new EntityNotFoundException("Party not found.");
        }

        var partyIds = new HashSet<int> { partyId };
        var frontier = new HashSet<int> { partyId };
        var relationships = new HashSet<PartyRelationshipDetails>();

        while (frontier.Count > 0)
        {
            var connections = await dbContext
                .PartyMemberships.AsNoTracking()
                .Where(relationship =>
                    frontier.Contains(relationship.MemberId)
                    || frontier.Contains(relationship.PartyId)
                )
                .OrderBy(relationship => relationship.PartyId)
                .ThenBy(relationship => relationship.MemberId)
                .ThenBy(relationship => relationship.Type)
                .Select(relationship => new PartyRelationshipDetails
                {
                    SourcePartyId = relationship.MemberId,
                    TargetPartyId = relationship.PartyId,
                    Type = relationship.Type,
                })
                .ToListAsync(cancellationToken);

            var nextFrontier = new HashSet<int>();
            foreach (var connection in connections)
            {
                if (relationships.Contains(connection))
                    continue;
                relationships.Add(connection);
                if (partyIds.Add(connection.SourcePartyId))
                    nextFrontier.Add(connection.SourcePartyId);
                if (partyIds.Add(connection.TargetPartyId))
                    nextFrontier.Add(connection.TargetPartyId);
            }
            frontier = nextFrontier;
        }

        var parties = await dbContext
            .Parties.AsNoTracking()
            .AsSplitQuery()
            .Where(party => partyIds.Contains(party.Id))
            .Include(party => party.Images)
                .ThenInclude(image => image.File)
                    .ThenInclude(file => file!.FileObjects)
            .OrderBy(party => party.Name)
            .ThenBy(party => party.Id)
            .ToListAsync(cancellationToken);

        return new PartyRelationshipGraph
        {
            FocusPartyId = partyId,
            Parties = parties
                .Select(party => new PartySummary
                {
                    PartyId = party.Id,
                    Name = party.Name,
                    Type = party.Type,
                    Kind = party.Kind,
                    Gender = party.Gender,
                    AvatarImages = party.ToPrimaryAvatarImages(assetsService),
                })
                .ToList(),
            Relationships = relationships
                .OrderBy(relationship => relationship.SourcePartyId)
                .ThenBy(relationship => relationship.TargetPartyId)
                .ThenBy(relationship => relationship.Type)
                .ToList(),
        };
    }

    public async Task<CreatePartyRelationshipResult> CreateRelationshipAsync(
        int sourcePartyId,
        CreatePartyRelationshipRequest request,
        CancellationToken cancellationToken = default
    )
    {
        Validator.ValidateObject(
            request,
            new ValidationContext(request),
            validateAllProperties: true
        );

        if (sourcePartyId <= 0)
        {
            throw new ValidationException("The source party ID must be positive.");
        }

        if (sourcePartyId == request.TargetPartyId)
        {
            throw new ValidationException("A party cannot have a relationship with itself.");
        }

        var partyIds = await dbContext
            .Parties.Where(party => party.Id == sourcePartyId || party.Id == request.TargetPartyId)
            .Select(party => party.Id)
            .ToListAsync(cancellationToken);

        if (!partyIds.Contains(sourcePartyId))
        {
            throw new EntityNotFoundException("Source party not found.");
        }

        if (!partyIds.Contains(request.TargetPartyId))
        {
            throw new EntityNotFoundException("Target party not found.");
        }

        if (
            await dbContext.PartyMemberships.AnyAsync(
                relationship =>
                    relationship.MemberId == sourcePartyId
                    && relationship.PartyId == request.TargetPartyId
                    && relationship.Type == request.Type,
                cancellationToken
            )
        )
        {
            throw new ConflictException("This relationship already exists.");
        }

        var relationship = new PartyMembership
        {
            MemberId = sourcePartyId,
            PartyId = request.TargetPartyId,
            Type = request.Type,
        };
        dbContext.PartyMemberships.Add(relationship);

        await dbContext.SaveChangesAsync(cancellationToken);

        return new CreatePartyRelationshipResult
        {
            SourcePartyId = sourcePartyId,
            TargetPartyId = request.TargetPartyId,
            Type = request.Type,
        };
    }
}
