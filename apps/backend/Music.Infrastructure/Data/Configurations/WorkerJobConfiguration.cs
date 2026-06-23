using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Music.Core.Entities;

namespace Music.Infrastructure.Data.Configurations;

public sealed class WorkerJobConfiguration : IEntityTypeConfiguration<WorkerJob>
{
    public void Configure(EntityTypeBuilder<WorkerJob> builder)
    {
        builder.ToTable("WorkerJobs");

        builder.HasKey(job => job.Id);

        builder.Property(job => job.Payload).IsRequired();
        builder.Property(job => job.Status).IsRequired();
        builder.Property(job => job.Type).IsRequired();

        builder.HasIndex(job => job.Status);
        builder.HasIndex(job => job.CreatedAt);
    }
}
