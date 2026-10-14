using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Music.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class OpaqueAuthSessions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // JWT sessions and bot tokens cannot become opaque tokens; everyone signs in again.
            migrationBuilder.Sql("""DELETE FROM "AuthTokens";""");

            migrationBuilder.DropForeignKey(
                name: "FK_AuthTokens_AspNetUsers_CreatedByUserId",
                table: "AuthTokens"
            );

            migrationBuilder.DropIndex(name: "IX_AuthTokens_Jti", table: "AuthTokens");

            migrationBuilder.DropColumn(name: "Jti", table: "AuthTokens");

            migrationBuilder.DropColumn(name: "Last5Digit", table: "AuthTokens");

            migrationBuilder.AlterColumn<string>(
                name: "Name",
                table: "AuthTokens",
                type: "character varying(128)",
                maxLength: 128,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "text"
            );

            migrationBuilder.AlterColumn<string>(
                name: "CreatedByUserId",
                table: "AuthTokens",
                type: "text",
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "text",
                oldNullable: true
            );

            migrationBuilder.AddColumn<int>(
                name: "Client",
                table: "AuthTokens",
                type: "integer",
                nullable: true
            );

            migrationBuilder.AddColumn<byte[]>(
                name: "TokenHash",
                table: "AuthTokens",
                type: "bytea",
                nullable: false,
                defaultValue: new byte[0]
            );

            migrationBuilder.CreateIndex(
                name: "IX_AuthTokens_TokenHash",
                table: "AuthTokens",
                column: "TokenHash",
                unique: true
            );

            migrationBuilder.AddForeignKey(
                name: "FK_AuthTokens_AspNetUsers_CreatedByUserId",
                table: "AuthTokens",
                column: "CreatedByUserId",
                principalTable: "AspNetUsers",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade
            );
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""DELETE FROM "AuthTokens";""");

            migrationBuilder.DropForeignKey(
                name: "FK_AuthTokens_AspNetUsers_CreatedByUserId",
                table: "AuthTokens"
            );

            migrationBuilder.DropIndex(name: "IX_AuthTokens_TokenHash", table: "AuthTokens");

            migrationBuilder.DropColumn(name: "Client", table: "AuthTokens");

            migrationBuilder.DropColumn(name: "TokenHash", table: "AuthTokens");

            migrationBuilder.AlterColumn<string>(
                name: "Name",
                table: "AuthTokens",
                type: "text",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(128)",
                oldMaxLength: 128
            );

            migrationBuilder.AlterColumn<string>(
                name: "CreatedByUserId",
                table: "AuthTokens",
                type: "text",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "text"
            );

            migrationBuilder.AddColumn<string>(
                name: "Jti",
                table: "AuthTokens",
                type: "text",
                nullable: false,
                defaultValue: ""
            );

            migrationBuilder.AddColumn<string>(
                name: "Last5Digit",
                table: "AuthTokens",
                type: "text",
                nullable: false,
                defaultValue: ""
            );

            migrationBuilder.CreateIndex(
                name: "IX_AuthTokens_Jti",
                table: "AuthTokens",
                column: "Jti",
                unique: true
            );

            migrationBuilder.AddForeignKey(
                name: "FK_AuthTokens_AspNetUsers_CreatedByUserId",
                table: "AuthTokens",
                column: "CreatedByUserId",
                principalTable: "AspNetUsers",
                principalColumn: "Id"
            );
        }
    }
}
