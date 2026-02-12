using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace Music.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class Init : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "AspNetRoles",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false),
                    Name = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true),
                    NormalizedName = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true),
                    ConcurrencyStamp = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AspNetRoles", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "AspNetUsers",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false),
                    UserName = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true),
                    NormalizedUserName = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true),
                    Email = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true),
                    NormalizedEmail = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true),
                    EmailConfirmed = table.Column<bool>(type: "boolean", nullable: false),
                    PasswordHash = table.Column<string>(type: "text", nullable: true),
                    SecurityStamp = table.Column<string>(type: "text", nullable: true),
                    ConcurrencyStamp = table.Column<string>(type: "text", nullable: true),
                    PhoneNumber = table.Column<string>(type: "text", nullable: true),
                    PhoneNumberConfirmed = table.Column<bool>(type: "boolean", nullable: false),
                    TwoFactorEnabled = table.Column<bool>(type: "boolean", nullable: false),
                    LockoutEnd = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    LockoutEnabled = table.Column<bool>(type: "boolean", nullable: false),
                    AccessFailedCount = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AspNetUsers", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Languages",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Name = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Languages", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "StoredFiles",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Type = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_StoredFiles", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "AspNetRoleClaims",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    RoleId = table.Column<string>(type: "text", nullable: false),
                    ClaimType = table.Column<string>(type: "text", nullable: true),
                    ClaimValue = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AspNetRoleClaims", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AspNetRoleClaims_AspNetRoles_RoleId",
                        column: x => x.RoleId,
                        principalTable: "AspNetRoles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AspNetUserClaims",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    UserId = table.Column<string>(type: "text", nullable: false),
                    ClaimType = table.Column<string>(type: "text", nullable: true),
                    ClaimValue = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AspNetUserClaims", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AspNetUserClaims_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AspNetUserLogins",
                columns: table => new
                {
                    LoginProvider = table.Column<string>(type: "text", nullable: false),
                    ProviderKey = table.Column<string>(type: "text", nullable: false),
                    ProviderDisplayName = table.Column<string>(type: "text", nullable: true),
                    UserId = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AspNetUserLogins", x => new { x.LoginProvider, x.ProviderKey });
                    table.ForeignKey(
                        name: "FK_AspNetUserLogins_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AspNetUserRoles",
                columns: table => new
                {
                    UserId = table.Column<string>(type: "text", nullable: false),
                    RoleId = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AspNetUserRoles", x => new { x.UserId, x.RoleId });
                    table.ForeignKey(
                        name: "FK_AspNetUserRoles_AspNetRoles_RoleId",
                        column: x => x.RoleId,
                        principalTable: "AspNetRoles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_AspNetUserRoles_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AspNetUserTokens",
                columns: table => new
                {
                    UserId = table.Column<string>(type: "text", nullable: false),
                    LoginProvider = table.Column<string>(type: "text", nullable: false),
                    Name = table.Column<string>(type: "text", nullable: false),
                    Value = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AspNetUserTokens", x => new { x.UserId, x.LoginProvider, x.Name });
                    table.ForeignKey(
                        name: "FK_AspNetUserTokens_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Albums",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Title = table.Column<string>(type: "text", nullable: false),
                    NormalizedTitle = table.Column<string>(type: "text", nullable: false),
                    Description = table.Column<string>(type: "text", nullable: false),
                    Type = table.Column<int>(type: "integer", nullable: false),
                    LanguageId = table.Column<int>(type: "integer", nullable: true),
                    CreatedByUserId = table.Column<string>(type: "text", nullable: false),
                    ReleaseDate = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    Version = table.Column<byte[]>(type: "bytea", rowVersion: true, nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Albums", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Albums_AspNetUsers_CreatedByUserId",
                        column: x => x.CreatedByUserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Albums_Languages_LanguageId",
                        column: x => x.LanguageId,
                        principalTable: "Languages",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "Parties",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Name = table.Column<string>(type: "text", nullable: false),
                    NormalizedName = table.Column<string>(type: "text", nullable: false),
                    ReleaseDate = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    LanguageId = table.Column<int>(type: "integer", nullable: true),
                    Type = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    Version = table.Column<byte[]>(type: "bytea", rowVersion: true, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Parties", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Parties_Languages_LanguageId",
                        column: x => x.LanguageId,
                        principalTable: "Languages",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "Tracks",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Title = table.Column<string>(type: "text", nullable: false),
                    NormalizedTitle = table.Column<string>(type: "text", nullable: false),
                    IsMC = table.Column<bool>(type: "boolean", nullable: false),
                    DurationInMs = table.Column<int>(type: "integer", nullable: false),
                    Description = table.Column<string>(type: "text", nullable: false),
                    LanguageId = table.Column<int>(type: "integer", nullable: true),
                    CreatedByUserId = table.Column<string>(type: "text", nullable: false),
                    Version = table.Column<byte[]>(type: "bytea", rowVersion: true, nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Tracks", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Tracks_AspNetUsers_CreatedByUserId",
                        column: x => x.CreatedByUserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Tracks_Languages_LanguageId",
                        column: x => x.LanguageId,
                        principalTable: "Languages",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "FileObjects",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    FileId = table.Column<int>(type: "integer", nullable: false),
                    ProcessingStatus = table.Column<int>(type: "integer", nullable: false),
                    StoragePath = table.Column<string>(type: "text", nullable: false),
                    OriginalBlake3Hash = table.Column<string>(type: "text", nullable: false),
                    CurrentBlake3Hash = table.Column<string>(type: "text", nullable: false),
                    FileSHA1 = table.Column<string>(type: "text", nullable: false),
                    Type = table.Column<int>(type: "integer", nullable: false),
                    FileObjectVariant = table.Column<int>(type: "integer", nullable: false),
                    SizeInBytes = table.Column<long>(type: "bigint", nullable: false),
                    MimeType = table.Column<string>(type: "text", nullable: false),
                    Container = table.Column<string>(type: "text", nullable: false),
                    Extension = table.Column<string>(type: "text", nullable: false),
                    Codec = table.Column<string>(type: "text", nullable: true),
                    Width = table.Column<int>(type: "integer", nullable: true),
                    Height = table.Column<int>(type: "integer", nullable: true),
                    AudioSampleRate = table.Column<int>(type: "integer", nullable: true),
                    Bitrate = table.Column<int>(type: "integer", nullable: true),
                    FrameRate = table.Column<decimal>(type: "numeric", nullable: true),
                    DurationInMs = table.Column<int>(type: "integer", nullable: true),
                    OriginalFileName = table.Column<string>(type: "text", nullable: false),
                    CreatedByUserId = table.Column<string>(type: "text", nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FileObjects", x => x.Id);
                    table.ForeignKey(
                        name: "FK_FileObjects_AspNetUsers_CreatedByUserId",
                        column: x => x.CreatedByUserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_FileObjects_StoredFiles_FileId",
                        column: x => x.FileId,
                        principalTable: "StoredFiles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AlbumDiscs",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    AlbumId = table.Column<int>(type: "integer", nullable: false),
                    DiscNumber = table.Column<int>(type: "integer", nullable: false),
                    Subtitle = table.Column<string>(type: "character varying(250)", maxLength: 250, nullable: false),
                    Version = table.Column<byte[]>(type: "bytea", rowVersion: true, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AlbumDiscs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AlbumDiscs_Albums_AlbumId",
                        column: x => x.AlbumId,
                        principalTable: "Albums",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AlbumImages",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    AlbumId = table.Column<int>(type: "integer", nullable: false),
                    FileId = table.Column<int>(type: "integer", nullable: false),
                    CropX = table.Column<int>(type: "integer", nullable: true),
                    CropY = table.Column<int>(type: "integer", nullable: true),
                    CropWidth = table.Column<int>(type: "integer", nullable: true),
                    CropHeight = table.Column<int>(type: "integer", nullable: true),
                    IsPrimary = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AlbumImages", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AlbumImages_Albums_AlbumId",
                        column: x => x.AlbumId,
                        principalTable: "Albums",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_AlbumImages_StoredFiles_FileId",
                        column: x => x.FileId,
                        principalTable: "StoredFiles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "AlbumCredits",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    AlbumId = table.Column<int>(type: "integer", nullable: false),
                    PartyId = table.Column<int>(type: "integer", nullable: false),
                    Credit = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AlbumCredits", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AlbumCredits_Albums_AlbumId",
                        column: x => x.AlbumId,
                        principalTable: "Albums",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_AlbumCredits_Parties_PartyId",
                        column: x => x.PartyId,
                        principalTable: "Parties",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "PartyAliases",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Name = table.Column<string>(type: "text", nullable: false),
                    NormalizedName = table.Column<string>(type: "text", nullable: false),
                    PartyId = table.Column<int>(type: "integer", nullable: false),
                    Type = table.Column<string>(type: "text", nullable: true),
                    SourceType = table.Column<int>(type: "integer", nullable: false),
                    CreatedByUserId = table.Column<string>(type: "text", nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    DeletedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PartyAliases", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PartyAliases_AspNetUsers_CreatedByUserId",
                        column: x => x.CreatedByUserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_PartyAliases_Parties_PartyId",
                        column: x => x.PartyId,
                        principalTable: "Parties",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "PartyImages",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    PartyId = table.Column<int>(type: "integer", nullable: false),
                    FileId = table.Column<int>(type: "integer", nullable: false),
                    CropX = table.Column<int>(type: "integer", nullable: true),
                    CropY = table.Column<int>(type: "integer", nullable: true),
                    CropWidth = table.Column<int>(type: "integer", nullable: true),
                    CropHeight = table.Column<int>(type: "integer", nullable: true),
                    IsPrimary = table.Column<bool>(type: "boolean", nullable: false),
                    PartyImageType = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PartyImages", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PartyImages_Parties_PartyId",
                        column: x => x.PartyId,
                        principalTable: "Parties",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_PartyImages_StoredFiles_FileId",
                        column: x => x.FileId,
                        principalTable: "StoredFiles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "PartyMemberships",
                columns: table => new
                {
                    PartyId = table.Column<int>(type: "integer", nullable: false),
                    MemberId = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PartyMemberships", x => new { x.PartyId, x.MemberId });
                    table.ForeignKey(
                        name: "FK_PartyMemberships_Parties_MemberId",
                        column: x => x.MemberId,
                        principalTable: "Parties",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_PartyMemberships_Parties_PartyId",
                        column: x => x.PartyId,
                        principalTable: "Parties",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "TrackCredits",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    TrackId = table.Column<int>(type: "integer", nullable: false),
                    PartyId = table.Column<int>(type: "integer", nullable: false),
                    Credit = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TrackCredits", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TrackCredits_Parties_PartyId",
                        column: x => x.PartyId,
                        principalTable: "Parties",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_TrackCredits_Tracks_TrackId",
                        column: x => x.TrackId,
                        principalTable: "Tracks",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "TrackVariants",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    TrackId = table.Column<int>(type: "integer", nullable: false),
                    VariantType = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TrackVariants", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TrackVariants_Tracks_TrackId",
                        column: x => x.TrackId,
                        principalTable: "Tracks",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AlbumTracks",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    AlbumDiscId = table.Column<int>(type: "integer", nullable: false),
                    TrackId = table.Column<int>(type: "integer", nullable: false),
                    TrackNumber = table.Column<int>(type: "integer", nullable: false),
                    Version = table.Column<byte[]>(type: "bytea", rowVersion: true, nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AlbumTracks", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AlbumTracks_AlbumDiscs_AlbumDiscId",
                        column: x => x.AlbumDiscId,
                        principalTable: "AlbumDiscs",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_AlbumTracks_Tracks_TrackId",
                        column: x => x.TrackId,
                        principalTable: "Tracks",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "TrackSources",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    TrackVariantId = table.Column<int>(type: "integer", nullable: false),
                    FileId = table.Column<int>(type: "integer", nullable: false),
                    Rank = table.Column<int>(type: "integer", nullable: false),
                    Pinned = table.Column<bool>(type: "boolean", nullable: false),
                    Source = table.Column<int>(type: "integer", nullable: false),
                    UploadedByUserId = table.Column<string>(type: "text", nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TrackSources", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TrackSources_AspNetUsers_UploadedByUserId",
                        column: x => x.UploadedByUserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_TrackSources_StoredFiles_FileId",
                        column: x => x.FileId,
                        principalTable: "StoredFiles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_TrackSources_TrackVariants_TrackVariantId",
                        column: x => x.TrackVariantId,
                        principalTable: "TrackVariants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.InsertData(
                table: "AspNetRoles",
                columns: new[] { "Id", "ConcurrencyStamp", "Name", "NormalizedName" },
                values: new object[,]
                {
                    { "00000000-0000-0000-0000-000000000001", "508a0eaf-dbca-47d9-baeb-597b81a4957e", "Admin", "ADMIN" },
                    { "00000000-0000-0000-0000-000000000002", "70b645e2-64b9-4d69-8a37-46413af238b0", "Uploader", "UPLOADER" },
                    { "00000000-0000-0000-0000-000000000003", "70b645e2-64b9-4d69-8a37-46413af238b0", "User", "USER" }
                });

            migrationBuilder.CreateIndex(
                name: "IX_AlbumCredits_AlbumId",
                table: "AlbumCredits",
                column: "AlbumId");

            migrationBuilder.CreateIndex(
                name: "IX_AlbumCredits_AlbumId_PartyId_Credit",
                table: "AlbumCredits",
                columns: new[] { "AlbumId", "PartyId", "Credit" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_AlbumCredits_Credit",
                table: "AlbumCredits",
                column: "Credit");

            migrationBuilder.CreateIndex(
                name: "IX_AlbumCredits_PartyId",
                table: "AlbumCredits",
                column: "PartyId");

            migrationBuilder.CreateIndex(
                name: "IX_AlbumDiscs_AlbumId",
                table: "AlbumDiscs",
                column: "AlbumId");

            migrationBuilder.CreateIndex(
                name: "IX_AlbumDiscs_AlbumId_DiscNumber",
                table: "AlbumDiscs",
                columns: new[] { "AlbumId", "DiscNumber" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_AlbumImages_AlbumId",
                table: "AlbumImages",
                column: "AlbumId");

            migrationBuilder.CreateIndex(
                name: "IX_AlbumImages_AlbumId_IsPrimary",
                table: "AlbumImages",
                columns: new[] { "AlbumId", "IsPrimary" });

            migrationBuilder.CreateIndex(
                name: "IX_AlbumImages_CreatedAt",
                table: "AlbumImages",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_AlbumImages_FileId",
                table: "AlbumImages",
                column: "FileId");

            migrationBuilder.CreateIndex(
                name: "IX_AlbumImages_IsPrimary",
                table: "AlbumImages",
                column: "IsPrimary");

            migrationBuilder.CreateIndex(
                name: "IX_Albums_CreatedAt",
                table: "Albums",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_Albums_CreatedByUserId",
                table: "Albums",
                column: "CreatedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_Albums_LanguageId",
                table: "Albums",
                column: "LanguageId");

            migrationBuilder.CreateIndex(
                name: "IX_Albums_NormalizedTitle",
                table: "Albums",
                column: "NormalizedTitle");

            migrationBuilder.CreateIndex(
                name: "IX_Albums_ReleaseDate",
                table: "Albums",
                column: "ReleaseDate");

            migrationBuilder.CreateIndex(
                name: "IX_Albums_Type",
                table: "Albums",
                column: "Type");

            migrationBuilder.CreateIndex(
                name: "IX_Albums_UpdatedAt",
                table: "Albums",
                column: "UpdatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_AlbumTracks_AlbumDiscId",
                table: "AlbumTracks",
                column: "AlbumDiscId");

            migrationBuilder.CreateIndex(
                name: "IX_AlbumTracks_AlbumDiscId_TrackId",
                table: "AlbumTracks",
                columns: new[] { "AlbumDiscId", "TrackId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_AlbumTracks_AlbumDiscId_TrackNumber",
                table: "AlbumTracks",
                columns: new[] { "AlbumDiscId", "TrackNumber" });

            migrationBuilder.CreateIndex(
                name: "IX_AlbumTracks_CreatedAt",
                table: "AlbumTracks",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_AlbumTracks_TrackId",
                table: "AlbumTracks",
                column: "TrackId");

            migrationBuilder.CreateIndex(
                name: "IX_AspNetRoleClaims_RoleId",
                table: "AspNetRoleClaims",
                column: "RoleId");

            migrationBuilder.CreateIndex(
                name: "RoleNameIndex",
                table: "AspNetRoles",
                column: "NormalizedName",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_AspNetUserClaims_UserId",
                table: "AspNetUserClaims",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_AspNetUserLogins_UserId",
                table: "AspNetUserLogins",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_AspNetUserRoles_RoleId",
                table: "AspNetUserRoles",
                column: "RoleId");

            migrationBuilder.CreateIndex(
                name: "EmailIndex",
                table: "AspNetUsers",
                column: "NormalizedEmail");

            migrationBuilder.CreateIndex(
                name: "UserNameIndex",
                table: "AspNetUsers",
                column: "NormalizedUserName",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_FileObjects_CreatedAt",
                table: "FileObjects",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_FileObjects_CreatedByUserId",
                table: "FileObjects",
                column: "CreatedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_FileObjects_CurrentBlake3Hash",
                table: "FileObjects",
                column: "CurrentBlake3Hash");

            migrationBuilder.CreateIndex(
                name: "IX_FileObjects_FileId",
                table: "FileObjects",
                column: "FileId");

            migrationBuilder.CreateIndex(
                name: "IX_FileObjects_FileId_Type",
                table: "FileObjects",
                columns: new[] { "FileId", "Type" });

            migrationBuilder.CreateIndex(
                name: "IX_FileObjects_MimeType",
                table: "FileObjects",
                column: "MimeType");

            migrationBuilder.CreateIndex(
                name: "IX_FileObjects_OriginalBlake3Hash",
                table: "FileObjects",
                column: "OriginalBlake3Hash");

            migrationBuilder.CreateIndex(
                name: "IX_FileObjects_Type",
                table: "FileObjects",
                column: "Type");

            migrationBuilder.CreateIndex(
                name: "IX_Languages_Name",
                table: "Languages",
                column: "Name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Parties_CreatedAt",
                table: "Parties",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_Parties_LanguageId",
                table: "Parties",
                column: "LanguageId");

            migrationBuilder.CreateIndex(
                name: "IX_Parties_NormalizedName",
                table: "Parties",
                column: "NormalizedName");

            migrationBuilder.CreateIndex(
                name: "IX_Parties_ReleaseDate",
                table: "Parties",
                column: "ReleaseDate");

            migrationBuilder.CreateIndex(
                name: "IX_Parties_Type",
                table: "Parties",
                column: "Type");

            migrationBuilder.CreateIndex(
                name: "IX_Parties_Type_LanguageId",
                table: "Parties",
                columns: new[] { "Type", "LanguageId" });

            migrationBuilder.CreateIndex(
                name: "IX_Parties_UpdatedAt",
                table: "Parties",
                column: "UpdatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_PartyAliases_CreatedAt",
                table: "PartyAliases",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_PartyAliases_CreatedByUserId",
                table: "PartyAliases",
                column: "CreatedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_PartyAliases_DeletedAt",
                table: "PartyAliases",
                column: "DeletedAt");

            migrationBuilder.CreateIndex(
                name: "IX_PartyAliases_NormalizedName",
                table: "PartyAliases",
                column: "NormalizedName");

            migrationBuilder.CreateIndex(
                name: "IX_PartyAliases_NormalizedName_DeletedAt",
                table: "PartyAliases",
                columns: new[] { "NormalizedName", "DeletedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_PartyAliases_PartyId",
                table: "PartyAliases",
                column: "PartyId");

            migrationBuilder.CreateIndex(
                name: "IX_PartyAliases_PartyId_DeletedAt",
                table: "PartyAliases",
                columns: new[] { "PartyId", "DeletedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_PartyAliases_SourceType",
                table: "PartyAliases",
                column: "SourceType");

            migrationBuilder.CreateIndex(
                name: "IX_PartyImages_CreatedAt",
                table: "PartyImages",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_PartyImages_FileId",
                table: "PartyImages",
                column: "FileId");

            migrationBuilder.CreateIndex(
                name: "IX_PartyImages_IsPrimary",
                table: "PartyImages",
                column: "IsPrimary");

            migrationBuilder.CreateIndex(
                name: "IX_PartyImages_PartyId",
                table: "PartyImages",
                column: "PartyId");

            migrationBuilder.CreateIndex(
                name: "IX_PartyImages_PartyId_IsPrimary",
                table: "PartyImages",
                columns: new[] { "PartyId", "IsPrimary" });

            migrationBuilder.CreateIndex(
                name: "IX_PartyImages_PartyId_PartyImageType",
                table: "PartyImages",
                columns: new[] { "PartyId", "PartyImageType" });

            migrationBuilder.CreateIndex(
                name: "IX_PartyImages_PartyImageType",
                table: "PartyImages",
                column: "PartyImageType");

            migrationBuilder.CreateIndex(
                name: "IX_PartyMemberships_MemberId",
                table: "PartyMemberships",
                column: "MemberId");

            migrationBuilder.CreateIndex(
                name: "IX_PartyMemberships_PartyId",
                table: "PartyMemberships",
                column: "PartyId");

            migrationBuilder.CreateIndex(
                name: "IX_StoredFiles_Type",
                table: "StoredFiles",
                column: "Type");

            migrationBuilder.CreateIndex(
                name: "IX_TrackCredits_Credit",
                table: "TrackCredits",
                column: "Credit");

            migrationBuilder.CreateIndex(
                name: "IX_TrackCredits_PartyId",
                table: "TrackCredits",
                column: "PartyId");

            migrationBuilder.CreateIndex(
                name: "IX_TrackCredits_TrackId",
                table: "TrackCredits",
                column: "TrackId");

            migrationBuilder.CreateIndex(
                name: "IX_TrackCredits_TrackId_PartyId_Credit",
                table: "TrackCredits",
                columns: new[] { "TrackId", "PartyId", "Credit" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Tracks_CreatedAt",
                table: "Tracks",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_Tracks_CreatedByUserId",
                table: "Tracks",
                column: "CreatedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_Tracks_IsMC",
                table: "Tracks",
                column: "IsMC");

            migrationBuilder.CreateIndex(
                name: "IX_Tracks_LanguageId",
                table: "Tracks",
                column: "LanguageId");

            migrationBuilder.CreateIndex(
                name: "IX_Tracks_LanguageId_IsMC",
                table: "Tracks",
                columns: new[] { "LanguageId", "IsMC" });

            migrationBuilder.CreateIndex(
                name: "IX_Tracks_NormalizedTitle",
                table: "Tracks",
                column: "NormalizedTitle");

            migrationBuilder.CreateIndex(
                name: "IX_Tracks_UpdatedAt",
                table: "Tracks",
                column: "UpdatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_TrackSources_CreatedAt",
                table: "TrackSources",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_TrackSources_FileId",
                table: "TrackSources",
                column: "FileId");

            migrationBuilder.CreateIndex(
                name: "IX_TrackSources_Pinned",
                table: "TrackSources",
                column: "Pinned");

            migrationBuilder.CreateIndex(
                name: "IX_TrackSources_Source",
                table: "TrackSources",
                column: "Source");

            migrationBuilder.CreateIndex(
                name: "IX_TrackSources_TrackVariantId",
                table: "TrackSources",
                column: "TrackVariantId");

            migrationBuilder.CreateIndex(
                name: "IX_TrackSources_TrackVariantId_Pinned_Rank",
                table: "TrackSources",
                columns: new[] { "TrackVariantId", "Pinned", "Rank" });

            migrationBuilder.CreateIndex(
                name: "IX_TrackSources_TrackVariantId_Source",
                table: "TrackSources",
                columns: new[] { "TrackVariantId", "Source" });

            migrationBuilder.CreateIndex(
                name: "IX_TrackSources_UploadedByUserId",
                table: "TrackSources",
                column: "UploadedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_TrackVariants_TrackId",
                table: "TrackVariants",
                column: "TrackId");

            migrationBuilder.CreateIndex(
                name: "IX_TrackVariants_TrackId_VariantType",
                table: "TrackVariants",
                columns: new[] { "TrackId", "VariantType" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_TrackVariants_VariantType",
                table: "TrackVariants",
                column: "VariantType");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AlbumCredits");

            migrationBuilder.DropTable(
                name: "AlbumImages");

            migrationBuilder.DropTable(
                name: "AlbumTracks");

            migrationBuilder.DropTable(
                name: "AspNetRoleClaims");

            migrationBuilder.DropTable(
                name: "AspNetUserClaims");

            migrationBuilder.DropTable(
                name: "AspNetUserLogins");

            migrationBuilder.DropTable(
                name: "AspNetUserRoles");

            migrationBuilder.DropTable(
                name: "AspNetUserTokens");

            migrationBuilder.DropTable(
                name: "FileObjects");

            migrationBuilder.DropTable(
                name: "PartyAliases");

            migrationBuilder.DropTable(
                name: "PartyImages");

            migrationBuilder.DropTable(
                name: "PartyMemberships");

            migrationBuilder.DropTable(
                name: "TrackCredits");

            migrationBuilder.DropTable(
                name: "TrackSources");

            migrationBuilder.DropTable(
                name: "AlbumDiscs");

            migrationBuilder.DropTable(
                name: "AspNetRoles");

            migrationBuilder.DropTable(
                name: "Parties");

            migrationBuilder.DropTable(
                name: "StoredFiles");

            migrationBuilder.DropTable(
                name: "TrackVariants");

            migrationBuilder.DropTable(
                name: "Albums");

            migrationBuilder.DropTable(
                name: "Tracks");

            migrationBuilder.DropTable(
                name: "AspNetUsers");

            migrationBuilder.DropTable(
                name: "Languages");
        }
    }
}
