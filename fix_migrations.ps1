$migrationsDir = "c:\Users\Bobing Corp\Desktop\bobings\supabase\migrations"
$files = Get-ChildItem -Path $migrationsDir -Filter "*.sql" | Where-Object { $_.Name -match "^\d{8}_" } | Sort-Object Name

# Groups by Date prefix to reset counter or maintain global order?
# Let's simple append a time-like suffix based on global sort order within that day.
# Actually, iterating and adding a sequence is enough.

foreach ($file in $files) {
    if ($file.Name -match "^(\d{8})_(.*)$") {
        $datePart = $matches[1]
        $rest = $matches[2]
        
        # We need to distinguish files that share the same datePart
        # Let's find all files with this datePart
        $dayFiles = $files | Where-Object { $_.Name -startswith "${datePart}_" } | Sort-Object Name
        
        $counter = 1
        foreach ($dayFile in $dayFiles) {
            $timeSuffix = "{0:D6}" -f $counter
            $newName = "${datePart}${timeSuffix}_${rest}"
            
            # Since we are iterating outer loop, we might process same file twice if we are not careful?
            # No, we will do a single pass over all files, check if it needs renaming.
            
            # Better approach: Group by Date
        }
    }
}

# Revised Clean Approach
$grouped = $files | Group-Object { $_.Name.Substring(0, 8) }

foreach ($group in $grouped) {
    $date = $group.Name
    $counter = 100000 # Start at 10:00:00 equivalent to ensure padding
    
    foreach ($file in $group.Group) {
        $oldName = $file.Name
        # Check if it already has a long timestamp (14 chars)
        if ($oldName -match "^\d{14}_") {
            item "Skipping $oldName (Already correct)"
            continue
        }
        
        # Extract the part after the date
        $suffix = $oldName.Substring(9) # 8 digits + 1 underscore
        
        $timestamp = "$date$counter"
        $newName = "${timestamp}_${suffix}"
        
        Rename-Item -Path $file.FullName -NewName $newName
        Write-Host "Renamed $oldName to $newName"
        
        $counter++
    }
}
