Add-Type -AssemblyName System.Drawing

$sourcePath = (Resolve-Path 'src/assets/la_molienda_logo.png').Path
$outIcoPath = [System.IO.Path]::Combine((Get-Location).Path, 'build/icon.ico')
$outPngPath = [System.IO.Path]::Combine((Get-Location).Path, 'build/icon.png')

$srcBmp = [System.Drawing.Bitmap]::FromFile($sourcePath)

# Standard Windows icon sizes
$sizes = @(16, 24, 32, 48, 64, 128, 256)

# Helper function to resize with high-quality bicubic filtering
function Get-ResizedBitmap($orig, $targetSize) {
    $bmp = New-Object System.Drawing.Bitmap($targetSize, $targetSize, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $g.Clear([System.Drawing.Color]::Transparent)
    $g.DrawImage($orig, 0, 0, $targetSize, $targetSize)
    $g.Dispose()
    return $bmp
}

# Helper to create DIB bytes (BITMAPINFOHEADER + BGRA bottom-to-top + 1-bit AND mask)
function Get-DibBytes($bmp, $w, $h) {
    $ms = New-Object System.IO.MemoryStream
    $bw = New-Object System.IO.BinaryWriter($ms)

    # 1. BITMAPINFOHEADER (40 bytes)
    $bw.Write([UInt32]40)               # biSize
    $bw.Write([Int32]$w)                # biWidth
    $bw.Write([Int32]($h * 2))          # biHeight (doubled for XOR + AND mask)
    $bw.Write([UInt16]1)                # biPlanes
    $bw.Write([UInt16]32)               # biBitCount
    $bw.Write([UInt32]0)                # biCompression (BI_RGB)
    
    $andRowBytes = [Math]::Ceiling($w / 32.0) * 4
    $andSize = [Int32]($andRowBytes * $h)
    $xorSize = [Int32]($w * $h * 4)
    $bw.Write([UInt32]($xorSize + $andSize)) # biSizeImage
    $bw.Write([Int32]0)                 # biXPelsPerMeter
    $bw.Write([Int32]0)                 # biYPelsPerMeter
    $bw.Write([UInt32]0)                # biClrUsed
    $bw.Write([UInt32]0)                # biClrImportant

    # 2. XOR Mask: Bottom-to-top BGRA
    for ($y = $h - 1; $y -ge 0; $y--) {
        for ($x = 0; $x -lt $w; $x++) {
            $pixel = $bmp.GetPixel($x, $y)
            $bw.Write([Byte]$pixel.B)
            $bw.Write([Byte]$pixel.G)
            $bw.Write([Byte]$pixel.R)
            $bw.Write([Byte]$pixel.A)
        }
    }

    # 3. AND Mask: Bottom-to-top 1-bit transparency mask (1 = transparent, 0 = opaque)
    for ($y = $h - 1; $y -ge 0; $y--) {
        $rowBits = New-Object Byte[] $andRowBytes
        for ($x = 0; $x -lt $w; $x++) {
            $pixel = $bmp.GetPixel($x, $y)
            if ($pixel.A -lt 128) {
                $byteIdx = [Math]::Floor($x / 8)
                $bitIdx = 7 - ($x % 8)
                $rowBits[$byteIdx] = $rowBits[$byteIdx] -bor (1 -shl $bitIdx)
            }
        }
        $bw.Write($rowBits, 0, $andRowBytes)
    }

    $bw.Flush()
    $bytes = $ms.ToArray()
    $bw.Close()
    $ms.Close()
    return $bytes
}

# Collect all icon images data
$entries = @()

foreach ($sz in $sizes) {
    $resized = Get-ResizedBitmap $srcBmp $sz
    if ($sz -eq 256) {
        # Save 256 as high-res PNG file for build/icon.png
        $resized.Save($outPngPath, [System.Drawing.Imaging.ImageFormat]::Png)
        
        # In ICO, 256 is stored as PNG stream
        $pngMs = New-Object System.IO.MemoryStream
        $resized.Save($pngMs, [System.Drawing.Imaging.ImageFormat]::Png)
        $data = $pngMs.ToArray()
        $pngMs.Close()
        $entries += @{
            Width = 0 # 0 means 256 in ICO directory
            Height = 0
            Bpp = 32
            Data = $data
        }
    } else {
        $dibData = Get-DibBytes $resized $sz $sz
        $entries += @{
            Width = $sz
            Height = $sz
            Bpp = 32
            Data = $dibData
        }
    }
    $resized.Dispose()
}

$srcBmp.Dispose()

# Now assemble standard ICO binary
$icoFs = New-Object System.IO.FileStream($outIcoPath, [System.IO.FileMode]::Create)
$icoBw = New-Object System.IO.BinaryWriter($icoFs)

# ICONDIR header (6 bytes)
$icoBw.Write([UInt16]0)                 # Reserved (must be 0)
$icoBw.Write([UInt16]1)                 # Type 1 = Icon
$icoBw.Write([UInt16]$entries.Count)   # Image count

# Directory entries are at offset 6, total dir size = count * 16
$offset = 6 + ($entries.Count * 16)

# Write ICONDIRENTRY (16 bytes each)
foreach ($entry in $entries) {
    $icoBw.Write([Byte]$entry.Width)           # Width
    $icoBw.Write([Byte]$entry.Height)          # Height
    $icoBw.Write([Byte]0)                      # Color count (0 for >= 8bpp)
    $icoBw.Write([Byte]0)                      # Reserved
    $icoBw.Write([UInt16]1)                    # Color planes
    $icoBw.Write([UInt16]$entry.Bpp)           # Bits per pixel
    $icoBw.Write([UInt32]$entry.Data.Length)   # Size of image data
    $icoBw.Write([UInt32]$offset)              # File offset of image data
    $offset += $entry.Data.Length
}

# Write Image Data blocks
foreach ($entry in $entries) {
    $icoBw.Write($entry.Data, 0, $entry.Data.Length)
}

$icoBw.Flush()
$icoBw.Close()
$icoFs.Close()

Write-Host "ICO successfully generated at: $outIcoPath"
Write-Host "Total entries: $($entries.Count), Total size: $((Get-Item $outIcoPath).Length) bytes"
