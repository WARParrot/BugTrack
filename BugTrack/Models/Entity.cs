namespace BugTrack.Models;

/// <summary>Diagram: «abstract» Entity — # id : UUID, + getId().</summary>
public abstract class Entity
{
    /// <summary>Client-generated identifier (diagram: <c>getId()</c>).</summary>
    public Guid Id { get; protected set; } = Guid.NewGuid();
}
