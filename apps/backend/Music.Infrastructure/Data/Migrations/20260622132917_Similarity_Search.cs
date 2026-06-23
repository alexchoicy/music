using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Music.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class Similarity_Search : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("CREATE EXTENSION IF NOT EXISTS pg_trgm;");
            migrationBuilder.Sql("CREATE EXTENSION IF NOT EXISTS unaccent;");

            migrationBuilder.Sql(
                """
                CREATE OR REPLACE FUNCTION public.immutable_unaccent(text)
                RETURNS text
                LANGUAGE sql
                IMMUTABLE
                STRICT
                PARALLEL SAFE
                AS $$
                  SELECT public.unaccent('public.unaccent'::regdictionary, $1)
                $$;
                """
            );

            migrationBuilder.Sql(
                "CREATE INDEX IF NOT EXISTS \"IX_Parties_NormalizedName_Unaccent_Trgm\" ON \"Parties\" USING gin (public.immutable_unaccent(\"NormalizedName\") gin_trgm_ops);"
            );
            migrationBuilder.Sql(
                "CREATE INDEX IF NOT EXISTS \"IX_PartyAliases_NormalizedName_Unaccent_Trgm\" ON \"PartyAliases\" USING gin (public.immutable_unaccent(\"NormalizedName\") gin_trgm_ops) WHERE \"DeletedAt\" IS NULL;"
            );
            migrationBuilder.Sql(
                "CREATE INDEX IF NOT EXISTS \"IX_Albums_NormalizedTitle_Unaccent_Trgm\" ON \"Albums\" USING gin (public.immutable_unaccent(\"NormalizedTitle\") gin_trgm_ops);"
            );
            migrationBuilder.Sql(
                "CREATE INDEX IF NOT EXISTS \"IX_Concerts_NormalizedTitle_Unaccent_Trgm\" ON \"Concerts\" USING gin (public.immutable_unaccent(\"NormalizedTitle\") gin_trgm_ops);"
            );
            migrationBuilder.Sql(
                "CREATE INDEX IF NOT EXISTS \"IX_Tracks_NormalizedTitle_Unaccent_Trgm\" ON \"Tracks\" USING gin (public.immutable_unaccent(\"NormalizedTitle\") gin_trgm_ops);"
            );
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("DROP INDEX IF EXISTS \"IX_Tracks_NormalizedTitle_Unaccent_Trgm\";");
            migrationBuilder.Sql("DROP INDEX IF EXISTS \"IX_Concerts_NormalizedTitle_Unaccent_Trgm\";");
            migrationBuilder.Sql("DROP INDEX IF EXISTS \"IX_Albums_NormalizedTitle_Unaccent_Trgm\";");
            migrationBuilder.Sql("DROP INDEX IF EXISTS \"IX_PartyAliases_NormalizedName_Unaccent_Trgm\";");
            migrationBuilder.Sql("DROP INDEX IF EXISTS \"IX_Parties_NormalizedName_Unaccent_Trgm\";");
            migrationBuilder.Sql("DROP FUNCTION IF EXISTS public.immutable_unaccent(text);");
        }
    }
}
