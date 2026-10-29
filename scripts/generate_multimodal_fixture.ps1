# Creates original, synthetic UI screenshots for the SG-AI-18 offline fixture.
# Requires Windows System.Drawing; no external images, fonts, or network access.
Add-Type -AssemblyName System.Drawing

$outputDir = Join-Path $PSScriptRoot '..\services\api\tests\evaluation\screenshots_v1'
New-Item -ItemType Directory -Path $outputDir -Force | Out-Null

function Color([string] $hex) { return [System.Drawing.ColorTranslator]::FromHtml($hex) }

function Paint-Rect($graphics, [string] $hex, [int] $x, [int] $y, [int] $width, [int] $height) {
    $brush = [System.Drawing.SolidBrush]::new((Color $hex))
    try { $graphics.FillRectangle($brush, $x, $y, $width, $height) }
    finally { $brush.Dispose() }
}

function Paint-Text($graphics, [string] $value, [int] $x, [int] $y,
                    [int] $size = 13, [string] $hex = '#151923', [bool] $bold = $false) {
    $style = if ($bold) { [System.Drawing.FontStyle]::Bold } else { [System.Drawing.FontStyle]::Regular }
    $font = [System.Drawing.Font]::new('Segoe UI', $size, $style)
    $brush = [System.Drawing.SolidBrush]::new((Color $hex))
    try { $graphics.DrawString($value, $font, $brush, [float] $x, [float] $y) }
    finally { $font.Dispose(); $brush.Dispose() }
}

function Paint-Frame($graphics, [string] $section, [string] $title) {
    Paint-Rect $graphics '#F7F8F5' 0 0 960 560
    Paint-Rect $graphics '#151923' 0 0 190 560
    Paint-Text $graphics 'NORTHSTAR' 28 25 19 '#C7F36B' $true
    Paint-Text $graphics 'Overview' 28 101 13 '#B7BEC9'
    Paint-Text $graphics 'Projects' 28 150 13 '#B7BEC9'
    Paint-Text $graphics 'Account' 28 199 13 '#B7BEC9'
    Paint-Text $graphics 'Reports' 28 248 13 '#B7BEC9'
    Paint-Rect $graphics '#FFFFFF' 190 0 770 66
    Paint-Text $graphics $section 220 20 12 '#526BEE' $true
    Paint-Text $graphics $title 222 88 25 '#151923' $true
}

function Paint-Card($graphics, [int] $x, [int] $y, [int] $width, [int] $height) {
    Paint-Rect $graphics '#E4E7E1' $x $y $width $height
    Paint-Rect $graphics '#FFFFFF' ($x + 1) ($y + 1) ($width - 2) ($height - 2)
}

function Paint-Input($graphics, [string] $label, [string] $value, [int] $x, [int] $y, [int] $width = 550) {
    Paint-Text $graphics $label $x $y 11 '#5E6673' $true
    Paint-Rect $graphics '#E4E7E1' $x ($y + 29) $width 43
    Paint-Rect $graphics '#FFFFFF' ($x + 1) ($y + 30) ($width - 2) 41
    Paint-Text $graphics $value ($x + 13) ($y + 38) 11 '#151923'
}

function Paint-Button($graphics, [string] $label, [int] $x, [int] $y, [int] $width = 170) {
    Paint-Rect $graphics '#C7F36B' $x $y $width 43
    Paint-Text $graphics $label ($x + 16) ($y + 9) 11 '#151923' $true
}

function Save-Screen([string] $name, [scriptblock] $content) {
    $bitmap = [System.Drawing.Bitmap]::new(960, 560)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    try {
        $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
        $graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
        & $content $graphics
        $bitmap.Save((Join-Path $outputDir "$name.png"), [System.Drawing.Imaging.ImageFormat]::Png)
    } finally { $graphics.Dispose(); $bitmap.Dispose() }
}

Save-Screen 'account_email' {
    param($g)
    Paint-Frame $g 'ACCOUNT / PROFILE' 'Email settings'
    Paint-Card $g 222 140 685 345
    Paint-Text $g 'Current email' 250 163 12 '#5E6673'
    Paint-Text $g 'alice@example.test' 250 189 16 '#151923' $true
    Paint-Input $g 'NEW EMAIL ADDRESS' 'new-address@example.test' 250 239 610
    Paint-Button $g 'Save email' 250 352
    Paint-Text $g 'Your profile email updates after you save.' 250 421 11 '#5E6673'
}

Save-Screen 'sign_in' {
    param($g)
    Paint-Frame $g 'ACCOUNT / ACCESS' 'Welcome back'
    Paint-Card $g 297 139 525 351
    Paint-Text $g 'Sign in to your account' 331 160 17 '#151923' $true
    Paint-Input $g 'EMAIL' 'name@example.test' 330 213 455
    Paint-Input $g 'PASSWORD' '************' 330 303 455
    Paint-Button $g 'Sign in' 330 410 455
}

Save-Screen 'verification_link' {
    param($g)
    Paint-Frame $g 'ACCOUNT / VERIFICATION' 'Check your inbox'
    Paint-Card $g 255 155 600 289
    Paint-Text $g 'Verification email sent' 285 184 19 '#151923' $true
    Paint-Text $g 'Open the link in your email to continue.' 285 237 13 '#5E6673'
    Paint-Rect $g '#EDF0F7' 285 298 540 77
    Paint-Text $g 'Link validity: details unavailable in this preview' 300 319 11 '#5E6673'
    Paint-Text $g 'Resend link' 285 396 11 '#526BEE' $true
}

Save-Screen 'project_board' {
    param($g)
    Paint-Frame $g 'WORKSPACE / PROJECTS' 'Team projects'
    foreach ($pair in @(@(222, 'Planning', '#526BEE'), @(453, 'In progress', '#F5A623'), @(684, 'Done', '#6CBF80'))) {
        $x = [int] $pair[0]
        Paint-Card $g $x 148 206 341
        Paint-Rect $g ([string] $pair[2]) ($x + 16) 172 10 10
        Paint-Text $g ([string] $pair[1]) ($x + 34) 159 13 '#151923' $true
        Paint-Rect $g '#EDF0F7' ($x + 16) 212 174 86
        Paint-Text $g 'Project card' ($x + 26) 229 11 '#151923'
        Paint-Rect $g '#EDF0F7' ($x + 16) 322 174 86
        Paint-Text $g 'Task notes' ($x + 26) 339 11 '#151923'
    }
}

Save-Screen 'password_reset' {
    param($g)
    Paint-Frame $g 'ACCOUNT / SECURITY' 'Reset your password'
    Paint-Card $g 274 145 566 342
    Paint-Text $g 'Enter your email to receive a reset link.' 305 179 13 '#5E6673'
    Paint-Input $g 'EMAIL ADDRESS' 'name@example.test' 305 243 501
    Paint-Button $g 'Send reset link' 305 352 501
    Paint-Text $g 'Back to sign in' 305 425 11 '#526BEE' $true
}

Save-Screen 'invoice_report' {
    param($g)
    Paint-Frame $g 'FINANCE / REPORTS' 'Invoice summary'
    Paint-Card $g 222 143 685 345
    Paint-Text $g 'Monthly billing' 250 163 16 '#151923' $true
    Paint-Text $g 'Invoice' 250 226 11 '#5E6673' $true
    Paint-Text $g 'Subtotal' 542 226 11 '#5E6673' $true
    Paint-Text $g 'Total' 752 226 11 '#5E6673' $true
    Paint-Rect $g '#E4E7E1' 249 258 630 1
    Paint-Text $g 'INV-1042' 250 275 12 '#151923'
    Paint-Text $g '$89.995' 542 275 12 '#151923'
    Paint-Text $g '$90.00' 752 275 12 '#151923'
    Paint-Rect $g '#E4E7E1' 249 318 630 1
    Paint-Text $g 'INV-1043' 250 335 12 '#151923'
    Paint-Text $g '$19.335' 542 335 12 '#151923'
    Paint-Text $g '$19.34' 752 335 12 '#151923'
    Paint-Button $g 'Export report' 250 415
}

Get-ChildItem -LiteralPath $outputDir -Filter '*.png' | Sort-Object Name | ForEach-Object {
    '{0} {1} bytes SHA256={2}' -f $_.Name, $_.Length, (Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
}
