-- Normalize existing weight notes so every row has at least one hashtag.
-- Unhashed "Petkit" becomes #Petkit; everything else without a tag gets #manual.

UPDATE weight_records
SET note = replace(note, 'Petkit', '#Petkit')
WHERE note IS NOT NULL
  AND instr(note, 'Petkit') > 0
  AND instr(note, '#Petkit') = 0;

UPDATE weight_records
SET note = replace(note, 'petkit', '#Petkit')
WHERE note IS NOT NULL
  AND instr(note, 'petkit') > 0
  AND instr(note, '#Petkit') = 0
  AND instr(note, '#petkit') = 0;

UPDATE weight_records
SET note = replace(note, 'PETKIT', '#Petkit')
WHERE note IS NOT NULL
  AND instr(note, 'PETKIT') > 0
  AND instr(note, '#Petkit') = 0;

UPDATE weight_records
SET note = '#manual'
WHERE note IS NULL OR trim(note) = '';

UPDATE weight_records
SET note = '#manual ' || note
WHERE note NOT LIKE '%#%';
