using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Music.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddFileObjectStorageArea : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "StorageArea",
                table: "FileObjects",
                type: "integer",
                nullable: true);

            migrationBuilder.Sql(
                """
                UPDATE "FileObjects"
                SET "StorageArea" = 0
                WHERE "FileId" IN (
                    SELECT "FileId" FROM "AlbumImages"
                    UNION
                    SELECT "FileId" FROM "PartyImages"
                    UNION
                    SELECT "FileId" FROM "ConcertImages"
                );
                """
            );

            migrationBuilder.Sql(
                """
                UPDATE "FileObjects"
                SET "StorageArea" = 1
                WHERE "FileId" IN (
                    SELECT "FileId" FROM "TrackAudios"
                    UNION
                    SELECT "FileId" FROM "ConcertFiles"
                );
                """
            );

            migrationBuilder.Sql(
                """
                UPDATE "FileObjects"
                SET "StorageArea" = 1
                WHERE "StorageArea" IS NULL;
                """
            );

            migrationBuilder.AlterColumn<int>(
                name: "StorageArea",
                table: "FileObjects",
                type: "integer",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "integer",
                oldNullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "StorageArea",
                table: "FileObjects");
        }
    }
}
