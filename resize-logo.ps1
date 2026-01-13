Add-Type -AssemblyName System.Drawing

$sourcePath = "C:\Users\jprudot\Desktop\proyectos\Monday\smart-row-highlighter\public\Designer (2).png"
$dest192 = "C:\Users\jprudot\Desktop\proyectos\Monday\smart-row-highlighter\public\icon-192x192.png"
$dest126 = "C:\Users\jprudot\Desktop\proyectos\Monday\smart-row-highlighter\public\logo.png"

$img = [System.Drawing.Image]::FromFile($sourcePath)

# Create 192x192
$newImg192 = New-Object System.Drawing.Bitmap(192, 192)
$graphics192 = [System.Drawing.Graphics]::FromImage($newImg192)
$graphics192.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$graphics192.DrawImage($img, 0, 0, 192, 192)
$newImg192.Save($dest192)

# Create 126x126
$newImg126 = New-Object System.Drawing.Bitmap(126, 126)
$graphics126 = [System.Drawing.Graphics]::FromImage($newImg126)
$graphics126.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$graphics126.DrawImage($img, 0, 0, 126, 126)
$newImg126.Save($dest126)

$img.Dispose()
$newImg192.Dispose()
$newImg126.Dispose()
$graphics192.Dispose()
$graphics126.Dispose()

Write-Host "Logo resized successfully!"
Write-Host "Created: icon-192x192.png (192x192)"
Write-Host "Created: logo.png (126x126)"
