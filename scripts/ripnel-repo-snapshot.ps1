# scripts/ripnel-repo-snapshot.ps1
# PowerShell 7+
# Genera un snapshot seguro del repo Ripnel sin incluir node_modules, .git, logs ni secretos.

param(
    [string]$Root = (Get-Location).Path,
    [int]$TreeDepth = 4
)

$ErrorActionPreference = "Stop"

Set-Location $Root

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$outDir = Join-Path $Root "docs\_repo-snapshots"
New-Item -ItemType Directory -Force $outDir | Out-Null

$outFile = Join-Path $outDir "ripnel-repo-snapshot-$timestamp.md"

$excludeDirs = @(
    ".git",
    "node_modules",
    "logs",
    "graphify-out",
    ".local",
    "dist",
    "build",
    ".next",
    "coverage",
    "playwright-report",
    "test-results",
    ".turbo",
    ".cache"
)

$secretNamePattern = '(?i)(\.env|secret|secrets|password|passwd|token|apikey|api_key|private|\.pem|\.key|credentials)'

function Add-Line {
    param([string]$Text = "")
    Add-Content -Path $outFile -Value $Text -Encoding UTF8
}

function Add-Section {
    param([string]$Title)
    Add-Line ""
    Add-Line "## $Title"
    Add-Line ""
}

function Should-ExcludePath {
    param([string]$Path)

    $parts = $Path -split '[\\/]+'
    foreach ($dir in $excludeDirs) {
        if ($parts -contains $dir) {
            return $true
        }
    }

    return $false
}

function Get-RelativePath {
    param([string]$FullPath)

    $resolvedRoot = (Resolve-Path $Root).Path.TrimEnd('\', '/')
    return $FullPath.Replace($resolvedRoot, "").TrimStart('\', '/')
}

function Add-CodeBlock {
    param(
        [string]$Language,
        [string[]]$Lines
    )

    Add-Line "``````$Language"
    foreach ($line in $Lines) {
        Add-Line $line
    }
    Add-Line "``````"
}

function Add-CommandOutput {
    param(
        [string]$Title,
        [string]$Command,
        [scriptblock]$Script
    )

    Add-Section $Title
    Add-Line "Command:"
    Add-CodeBlock "powershell" @($Command)
    Add-Line "Output:"

    try {
        $result = & $Script 2>&1 | Out-String -Width 240
        Add-CodeBlock "text" @($result.TrimEnd())
    }
    catch {
        Add-CodeBlock "text" @("ERROR: $($_.Exception.Message)")
    }
}

function Add-FilePreview {
    param(
        [string]$Path,
        [int]$MaxLines = 220
    )

    if (-not (Test-Path $Path)) {
        return
    }

    $item = Get-Item $Path -Force

    if ($item.Name -match $secretNamePattern) {
        Add-Line "Skipped secret-like file: $Path"
        return
    }

    Add-Line ""
    Add-Line "### $Path"
    Add-Line ""

    $lines = Get-Content -Path $Path -TotalCount $MaxLines -ErrorAction SilentlyContinue

    Add-CodeBlock "text" $lines

    $totalLines = (Get-Content -Path $Path -ErrorAction SilentlyContinue | Measure-Object -Line).Lines
    if ($totalLines -gt $MaxLines) {
        Add-Line ""
        Add-Line "_Preview truncated: $MaxLines of $totalLines lines._"
    }
}

function Get-SafeFiles {
    Get-ChildItem -Path $Root -Recurse -File -Force |
        Where-Object {
            -not (Should-ExcludePath $_.FullName)
        }
}

function Get-SafeDirs {
    Get-ChildItem -Path $Root -Recurse -Directory -Force |
        Where-Object {
            -not (Should-ExcludePath $_.FullName)
        }
}

function Add-Tree {
    param(
        [string]$BasePath,
        [int]$Depth = 4
    )

    if (-not (Test-Path $BasePath)) {
        Add-CodeBlock "text" @("Path not found: $BasePath")
        return
    }

    $base = Resolve-Path $BasePath

    $items = Get-ChildItem -Path $base -Recurse -Force |
        Where-Object {
            -not (Should-ExcludePath $_.FullName)
        } |
        Where-Object {
            $rel = Get-RelativePath $_.FullName
            (($rel -split '[\\/]+').Count -le $Depth)
        } |
        Sort-Object FullName |
        ForEach-Object {
            $rel = Get-RelativePath $_.FullName
            if ($_.PSIsContainer) {
                "[D] $rel"
            }
            else {
                "[F] $rel"
            }
        }

    Add-CodeBlock "text" $items
}

# Header
Add-Line "# Ripnel Repo Snapshot"
Add-Line ""
Add-Line "- Generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
Add-Line "- Root: $Root"
Add-Line "- Tree depth: $TreeDepth"
Add-Line ""

# Basic git info
Add-CommandOutput "Git status" "git status --short --branch" {
    git status --short --branch
}

Add-CommandOutput "Git remotes" "git remote -v" {
    git remote -v
}

Add-CommandOutput "Latest commits" "git log --oneline -n 8" {
    git log --oneline -n 8
}

# Root listing
Add-Section "Root directory"
$rootItems = Get-ChildItem -Path $Root -Force |
    Sort-Object PSIsContainer, Name |
    ForEach-Object {
        $type = if ($_.PSIsContainer) { "[D]" } else { "[F]" }
        $size = if ($_.PSIsContainer) { "" } else { "$([math]::Round($_.Length / 1KB, 1)) KB" }
        "$type $($_.Name) $size"
    }

Add-CodeBlock "text" $rootItems

# Repo tree
Add-Section "Safe tree"
Add-Tree -BasePath $Root -Depth $TreeDepth

# Important directories
foreach ($dir in @("apps", "database", "supabase", "docs", ".github", ".opencode")) {
    Add-Section "Tree: $dir"
    Add-Tree -BasePath (Join-Path $Root $dir) -Depth 5
}

# Config files
Add-Section "Config / deployment / tooling files found"
$configFiles = Get-SafeFiles |
    Where-Object {
        $_.Name -match '^(package\.json|package-lock\.json|pnpm-workspace\.yaml|yarn\.lock|turbo\.json|nx\.json|vite\.config\..*|next\.config\..*|tsconfig.*\.json|Dockerfile.*|docker-compose.*\.ya?ml|Makefile|README\.md|AGENTS\.md|DESIGN\.md)$' -or
        $_.Name -match '(\.config\.(js|ts|mjs|cjs)|\.ya?ml)$'
    } |
    Select-Object @{Name="Path";Expression={ Get-RelativePath $_.FullName }},
                  @{Name="KB";Expression={ [math]::Round($_.Length / 1KB, 1) }} |
    Sort-Object Path |
    Format-Table -AutoSize |
    Out-String -Width 240

Add-CodeBlock "text" @($configFiles.TrimEnd())

# Secret-like files - names only
Add-Section "Secret-like files detected - names only, content not included"
$secretFiles = Get-ChildItem -Path $Root -Recurse -File -Force |
    Where-Object {
        -not (Should-ExcludePath $_.FullName)
    } |
    Where-Object {
        $_.Name -match $secretNamePattern
    } |
    Select-Object @{Name="Path";Expression={ Get-RelativePath $_.FullName }} |
    Sort-Object Path |
    Format-Table -AutoSize |
    Out-String -Width 240

if ([string]::IsNullOrWhiteSpace($secretFiles)) {
    Add-CodeBlock "text" @("No secret-like files found outside excluded directories.")
}
else {
    Add-CodeBlock "text" @($secretFiles.TrimEnd())
}

# Top largest source files
Add-Section "Largest source/documentation files"
$sourceExt = @(".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".json", ".md", ".sql", ".prisma", ".css", ".scss", ".html", ".yml", ".yaml")

$largestFiles = Get-SafeFiles |
    Where-Object {
        $sourceExt -contains $_.Extension.ToLower()
    } |
    Sort-Object Length -Descending |
    Select-Object -First 60 `
        @{Name="KB";Expression={ [math]::Round($_.Length / 1KB, 1) }},
        @{Name="Path";Expression={ Get-RelativePath $_.FullName }} |
    Format-Table -AutoSize |
    Out-String -Width 240

Add-CodeBlock "text" @($largestFiles.TrimEnd())

# File count by extension
Add-Section "File count by extension"
$fileCounts = Get-SafeFiles |
    Group-Object Extension |
    Sort-Object Count -Descending |
    Select-Object Count, Name |
    Format-Table -AutoSize |
    Out-String -Width 240

Add-CodeBlock "text" @($fileCounts.TrimEnd())

# Package info
Add-Section "package.json preview"
Add-FilePreview -Path "package.json" -MaxLines 260

# Main docs preview
Add-Section "Main documentation previews"
foreach ($file in @("README.md", "AGENTS.md", "DESIGN.md")) {
    Add-FilePreview -Path $file -MaxLines 220
}

# App package files
Add-Section "App-level package.json files"
$appPackages = Get-SafeFiles |
    Where-Object {
        $_.Name -eq "package.json" -and (Get-RelativePath $_.FullName) -match '^apps[\\/]'
    } |
    Sort-Object FullName

foreach ($pkg in $appPackages) {
    Add-FilePreview -Path (Get-RelativePath $pkg.FullName) -MaxLines 180
}

# Database files
Add-Section "Database and migration files"
$dbFiles = Get-SafeFiles |
    Where-Object {
        (Get-RelativePath $_.FullName) -match '^(database|supabase)[\\/]'
    } |
    Select-Object @{Name="Path";Expression={ Get-RelativePath $_.FullName }},
                  @{Name="KB";Expression={ [math]::Round($_.Length / 1KB, 1) }} |
    Sort-Object Path |
    Format-Table -AutoSize |
    Out-String -Width 240

Add-CodeBlock "text" @($dbFiles.TrimEnd())

# Pattern index: filenames only
Add-Section "Domain pattern index - filenames only"

$patterns = @{
    "auth/session/role/permission" = "auth|session|role|permission|login|logout|user"
    "inventory/stock/movement"     = "inventory|stock|movement|kardex|adjustment"
    "transfers"                    = "transfer|transferencia"
    "sales/pos/payment"            = "sale|sales|pos|payment|cash|checkout|venta"
    "purchase/orders/suppliers"    = "purchase|supplier|order|compra|proveedor"
    "production/bom"               = "production|bom|material|consumption|produccion"
    "api/routes/controllers"       = "api|route|controller|handler|endpoint"
}

$allSafeTextFiles = Get-SafeFiles |
    Where-Object {
        @(".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".sql", ".md", ".json") -contains $_.Extension.ToLower()
    }

foreach ($label in $patterns.Keys) {
    Add-Line ""
    Add-Line "### $label"
    Add-Line ""

    $matches = foreach ($file in $allSafeTextFiles) {
        $hitCount = (Select-String -Path $file.FullName -Pattern $patterns[$label] -SimpleMatch:$false -ErrorAction SilentlyContinue | Measure-Object).Count
        if ($hitCount -gt 0) {
            [PSCustomObject]@{
                Matches = $hitCount
                Path    = Get-RelativePath $file.FullName
            }
        }
    }

    if ($matches) {
        $text = $matches |
            Sort-Object Matches -Descending |
            Select-Object -First 40 |
            Format-Table -AutoSize |
            Out-String -Width 240

        Add-CodeBlock "text" @($text.TrimEnd())
    }
    else {
        Add-CodeBlock "text" @("No matches.")
    }
}

Add-Section "Snapshot generated"
Add-CodeBlock "text" @($outFile)

Write-Host "Snapshot generated:"
Write-Host $outFile