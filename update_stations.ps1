$ErrorActionPreference = "Stop"

$Url = "https://corporatedataapi.paz.co.il/api/wash-stations/search"
Write-Host "Fetching stations from $Url ..."

# Adding headers to trick the Paz firewall into thinking this is a real browser
$Headers = @{
    "User-Agent" = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    "Accept" = "application/json, text/plain, */*"
    "Referer" = "https://www.paz.co.il/"
}

$Response = $null
$Success = $true

# Attempt 1: Try Direct Connection first (Fastest for local execution)
try {
    Write-Host "Attempting direct local connection..."
    $Response = Invoke-RestMethod -Uri $Url -Method Post -Body "{}" -ContentType "application/json" -Headers $Headers -TimeoutSec 5 -ErrorAction Stop
} catch {
    Write-Host "Direct connection failed (Likely Geo-Blocked). Error: $($_.Exception.Message)"
    $Success = $false
}

# Attempt 2: Dynamic Free Israeli Proxy Hunter (For GitHub Actions)
if (-not $Success) {
    Write-Host "Initializing Dynamic Free Israeli Proxy Hunter..."
    $ProxyListUrl = "https://api.proxyscrape.com/v2/?request=displayproxies&protocol=http&timeout=5000&country=IL&ssl=all&anonymity=all"
    $Proxies = @()
    
    try {
        $Proxies = (Invoke-RestMethod -Uri $ProxyListUrl -ErrorAction Stop) -split "`n" | Where-Object { $_ -match "\S" } | ForEach-Object { $_.Trim() }
        Write-Host "Found $($Proxies.Count) potential free Israeli proxies!"
    } catch {
        Write-Host "Could not fetch proxy list."
    }

    foreach ($Proxy in $Proxies) {
        Write-Host "Attempting via proxy: http://$Proxy ..."
        try {
            $Response = Invoke-RestMethod -Uri $Url -Method Post -Body "{}" -ContentType "application/json" -Headers $Headers -Proxy "http://$Proxy" -TimeoutSec 10 -ErrorAction Stop
            
            if ($Response -and $Response.Body) {
                Write-Host "SUCCESS! Tunnel established through proxy $Proxy!"
                $Success = $true
                break
            }
        } catch {
            Write-Host "Proxy $Proxy failed or timed out. Moving to next..."
        }
    }
}

if ($Response -and $Response.Body) {
    Write-Host "Found $($Response.Body.Count) stations. Parsing data..."
    
    $Stations = $Response.Body | ForEach-Object {
        @{
            name = $_.Name
            # The Paz API has Latitude and Longitude slightly flipped for Israeli coordinates!
            # Real Latitude is ~32 (which is mapped to their Longitude field)
            # Real Longitude is ~34 (which is mapped to their Latitude field)
            lat = $_.Coordinate.Longitude
            lon = $_.Coordinate.Latitude
            address = $_.Street + ", " + $_.CityName
        }
    }
    
    $JsonData = $Stations | ConvertTo-Json -Depth 5 -Compress: $false
    
    # Save as a JS file to completely bypass CORS issues when the user opens index.html locally!
    $OutputFile = Join-Path -Path $PSScriptRoot -ChildPath "stations.js"
    "const pazStations = " + $JsonData + ";" | Out-File -FilePath $OutputFile -Encoding utf8
    
    # Add timestamp
    $Timestamp = (Get-Date).ToString("dd/MM/yyyy HH:mm")
    "const lastUpdated = `"$Timestamp`";" | Add-Content -Path $OutputFile -Encoding utf8
    
    Write-Host "Saved updated stations to $OutputFile successfully!"
} else {
    Write-Error "Failed to receive valid data from Paz API."
}
