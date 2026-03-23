$ErrorActionPreference = "Stop"

$Url = "https://corporatedataapi.paz.co.il/api/wash-stations/search"
Write-Host "Fetching stations from $Url ..."

# Adding headers to trick the Paz firewall into thinking this is a real browser (not an American cloud server).
$Headers = @{
    "User-Agent" = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    "Accept" = "application/json, text/plain, */*"
    "Referer" = "https://www.paz.co.il/"
}

# Sending POST request to the Paz Data API
$Response = Invoke-RestMethod -Uri $Url -Method Post -Body "{}" -ContentType "application/json" -Headers $Headers

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
