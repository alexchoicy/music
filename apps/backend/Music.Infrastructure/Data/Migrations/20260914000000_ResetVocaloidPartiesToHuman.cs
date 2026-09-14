using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

namespace Music.Infrastructure.Data.Migrations;

[DbContext(typeof(AppDbContext))]
[Migration("20260914000000_ResetVocaloidPartiesToHuman")]
public sealed class ResetVocaloidPartiesToHuman : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql("""
            UPDATE "Parties"
            SET "Kind" = 0
            WHERE "Kind" = 2;
            """);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        // The original Vocaloid rows cannot be distinguished from existing Human rows.
    }
}
