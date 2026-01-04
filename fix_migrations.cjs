const fs = require('fs');
const path = require('path');

const migrationsDir = path.join(__dirname, 'supabase', 'migrations');

// Read all files
fs.readdir(migrationsDir, (err, files) => {
    if (err) {
        console.error("Could not list directory", err);
        process.exit(1);
    }

    // Filter sql files
    const sqlFiles = files.filter(f => f.endsWith('.sql'));

    // Group by date prefix (8 digits)
    const grouped = {};
    sqlFiles.forEach(f => {
        const match = f.match(/^(\d{8})_(.*)$/);
        if (match) {
            const date = match[1];
            if (!grouped[date]) grouped[date] = [];
            grouped[date].push(f);
        }
    });

    Object.keys(grouped).forEach(date => {
        const groupFiles = grouped[date].sort(); // Alphabetical sort ensures stable order
        // Check if any file in this group is ALREADY long format (14 digits)
        // If so, we assume mixed content and maybe just skip or handle carefully?
        // Actually the regex ^\d{8}_ matches 20260102_ but also 20260102120000_ (14 digits)
        // because \d{8} matches the first 8.
        // We want to target ONLY those with STRICTLY 8 digits prefix.

        // Let's refine the match
        const strictShortFiles = groupFiles.filter(f => /^\d{8}_/.test(f) && !/^\d{14}_/.test(f));

        if (strictShortFiles.length > 0) {
            console.log(`Processing date group: ${date} (${strictShortFiles.length} files)`);
            let counter = 100000; // Start at 10:00:00 equivalent

            strictShortFiles.forEach(file => {
                const suffix = file.substring(9); // remove 20260102_
                const timestamp = `${date}${counter}`;
                const newName = `${timestamp}_${suffix}`;

                const oldPath = path.join(migrationsDir, file);
                const newPath = path.join(migrationsDir, newName);

                fs.renameSync(oldPath, newPath);
                console.log(`Renamed: ${file} -> ${newName}`);
                counter++;
            });
        }
    });
});
