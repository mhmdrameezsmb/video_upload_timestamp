const mysql = require('mysql2');
const ffmpeg = require('fluent-ffmpeg');
const path = require('path');

// Create MySQL connection
const connection = mysql.createConnection({
  host: 'localhost',        // MySQL server address
  user: 'your_username',    // MySQL username
  password: 'your_password',// MySQL password
  database: 'your_database' // MySQL database name
});

// Connect to MySQL database
connection.connect((err) => {
  if (err) {
    console.error('Error connecting to MySQL:', err.stack);
    return;
  }
  console.log('Connected to MySQL database');
});

// Function to get video duration using FFmpeg
function getVideoDuration(filePath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) {
        return reject('Error fetching video duration: ' + err.message);
      }
      const durationInSeconds = metadata.format.duration;
      resolve(durationInSeconds);
    });
  });
}

// Function to format duration (seconds to HH:MM:SS)
function formatDuration(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
}

// Function to update video duration in MySQL
function updateVideoDuration(videoUrl, duration) {
  const query = `UPDATE topic_details SET video_duration = ? WHERE video_url = ? AND type = 'video' AND video_type = 'upload'`;
  connection.execute(query, [duration, videoUrl], (err, results) => {
    if (err) {
      console.error('Error updating database:', err.stack);
      return;
    }
    console.log(`Updated duration for ${videoUrl} to ${duration}`);
  });
}

// Main function
async function main() {
  try {
    // Get video URLs from 'topic_details' table where type = 'video' and video_type = 'upload'
    connection.query("SELECT video_url FROM topic_details WHERE type = 'video' AND video_type = 'upload'", async (err, results) => {
      if (err) {
        console.error('Error fetching video URLs:', err.stack);
        return;
      }

      for (const row of results) {
        const videoUrl = row.video_url;
        console.log(`Processing video: ${videoUrl}`);
        
        // Assuming video is stored locally, adjust the file path if necessary
        const filePath = path.join(__dirname, 'videos', path.basename(videoUrl)); // Adjust path based on actual file location
        
        try {
          // Get video duration
          const durationInSeconds = await getVideoDuration(filePath);
          const formattedDuration = formatDuration(durationInSeconds);

          // Update database with the video duration
          updateVideoDuration(videoUrl, formattedDuration);
        } catch (err) {
          console.error(`Error processing ${videoUrl}: ${err}`);
        }
      }
    });
  } catch (err) {
    console.error('Error in main function:', err);
  }
}

// Run the script
main();

// Close MySQL connection when done
process.on('exit', () => {
  connection.end();
});
