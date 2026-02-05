using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using Music.Core.Utils;
using Music.Core.Entities;
using Music.Infrastructure.Entities;

namespace Music.Infrastructure.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : IdentityDbContext<User>(options)
{
    public DbSet<Language> Languages { get; set; }

    public DbSet<Party> Parties { get; set; }
    public DbSet<PartyAlias> PartyAliases { get; set; }
    public DbSet<PartyMembership> PartyMemberships { get; set; }
    public DbSet<PartyImage> PartyImages { get; set; }
    public DbSet<Album> Albums { get; set; }
    public DbSet<AlbumCredit> AlbumCredits { get; set; }
    public DbSet<AlbumImage> AlbumImages { get; set; }
    public DbSet<Track> Tracks { get; set; }
    public DbSet<AlbumTrack> AlbumTracks { get; set; }
    public DbSet<TrackVariant> TrackVariants { get; set; }
    public DbSet<TrackCredit> TrackCredits { get; set; }
    public DbSet<TrackSource> TrackSources { get; set; }
    public DbSet<StoredFile> StoredFiles { get; set; }
    public DbSet<FileObject> FileObjects { get; set; }



    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);
        builder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);

        List<IdentityRole> roles =
        [
            new IdentityRole
            {
                Id = "00000000-0000-0000-0000-000000000001",
                Name = Core.Enums.Roles.Admin.ToString(),
                NormalizedName = Core.Enums.Roles.Admin.ToString().ToUpper(),
                ConcurrencyStamp = "508a0eaf-dbca-47d9-baeb-597b81a4957e"
            },
            new IdentityRole
            {
                Id = "00000000-0000-0000-0000-000000000002",
                Name = Core.Enums.Roles.Uploader.ToString(),
                NormalizedName = Core.Enums.Roles.Uploader.ToString().ToUpper(),
                ConcurrencyStamp = "70b645e2-64b9-4d69-8a37-46413af238b0"
            },
            new IdentityRole
            {
                Id = "00000000-0000-0000-0000-000000000003",
                Name = Core.Enums.Roles.User.ToString(),
                NormalizedName = Core.Enums.Roles.User.ToString().ToUpper(),
                ConcurrencyStamp = "70b645e2-64b9-4d69-8a37-46413af238b0"
            }
        ];

        builder.Entity<IdentityRole>().HasData(roles);
    }

    public override int SaveChanges()
    {
        NormalizeEntities();
        return base.SaveChanges();
    }

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        NormalizeEntities();
        return base.SaveChangesAsync(cancellationToken);
    }


    private void NormalizeEntities()
    {
        IEnumerable<EntityEntry> entries = ChangeTracker.Entries()
            .Where(entry => entry.State is EntityState.Added or EntityState.Modified);

        foreach (var entry in entries)
        {
            switch (entry.Entity)
            {
                case Party party:
                    party.NormalizedName = StringUtils.NormalizeString(party.Name);
                    break;
                case PartyAlias partyAlias:
                    partyAlias.NormalizedName = StringUtils.NormalizeString(partyAlias.Name);
                    break;
                case Album album:
                    album.NormalizedTitle = StringUtils.NormalizeString(album.Title);
                    break;
                case Track track:
                    track.NormalizedTitle = StringUtils.NormalizeString(track.Title);
                    break;
            }
        }
    }

}
