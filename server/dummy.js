const fs = require('fs/promises');
const path = require('path');

// NOTE: Since I can only replace contiguous blocks or make edits using multi_replace_file_content,
// I should use `multi_replace_file_content` instead of `write_to_file` to modify these files.
