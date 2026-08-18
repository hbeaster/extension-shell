using System.Text.Json.Serialization;

namespace Shell.Api.ExtensionCatalog;

// On-disk shape of an installed extension's package.json. Everything is
// nullable: this file is written by extension authors and, in mount mode, put
// in place by deployers, so the scanner validates rather than assumes.
// Deliberately classes with init setters, not positional records — a partial
// object has to bind without every member being present.

internal sealed class PackageJsonManifest
{
    public string? Name { get; init; }

    public string? Version { get; init; }

    [JsonPropertyName("bc-extension")]
    public BcExtensionSection? BcExtension { get; init; }
}

internal sealed class BcExtensionSection
{
    public string? Type { get; init; }

    public string? DisplayName { get; init; }

    public string? Tag { get; init; }

    public string? Module { get; init; }

    public string? Icon { get; init; }

    public DiscoverySection? Discovery { get; init; }

    public Dictionary<string, ServiceRequirementSection>? Services { get; init; }
}

internal sealed class DiscoverySection
{
    public List<CapabilityRefSection>? Implements { get; init; }

    public List<CapabilityRefSection>? Requires { get; init; }
}

internal sealed class CapabilityRefSection
{
    public string? Name { get; init; }

    public List<string>? Versions { get; init; }
}

internal sealed class ServiceRequirementSection
{
    public bool Optional { get; init; }

    public List<string>? Versions { get; init; }
}
