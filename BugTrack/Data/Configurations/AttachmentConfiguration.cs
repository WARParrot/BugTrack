using BugTrack.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BugTrack.Data.Configurations;

public sealed class AttachmentConfiguration : EntityConfiguration<Attachment>
{
    protected override void ConfigureEntity(EntityTypeBuilder<Attachment> b)
    {
        b.ToTable("Attachments");
        b.Property(a => a.Type).HasConversion<string>().HasMaxLength(16);
        b.Property(a => a.Url).IsRequired().HasMaxLength(2048);

        b.HasOne<Ticket>().WithMany(t => t.Attachments).HasForeignKey("TicketId").IsRequired().OnDelete(DeleteBehavior.Cascade);
        b.HasOne(a => a.UploadedBy).WithMany().HasForeignKey("UploadedById").IsRequired().OnDelete(DeleteBehavior.Restrict);
    }
}
