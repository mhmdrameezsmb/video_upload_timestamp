const mysql = require('mysql2');
const ffmpeg = require('fluent-ffmpeg');
const cliProgress = require('cli-progress');

// Set path to ffprobe (if necessary)
const ffprobePath = 'C:/ffmpeg/bin/ffprobe'; // Adjust the path based on your system
ffmpeg.setFfprobePath(ffprobePath);

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

// Function to get video duration using FFmpeg (remote URL)
function getVideoDuration(videoUrl) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoUrl, (err, metadata) => {
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
  const query = `UPDATE topic_details SET video_duration = ? WHERE content = ? AND type = 'video' AND video_type = 'upload'`;
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
    connection.query("SELECT content FROM topic_details WHERE type = 'video' AND video_type = 'upload'", async (err, results) => {
      if (err) {
        console.error('Error fetching video URLs:', err.stack);
        return;
      }

      const totalVideos = results.length;
      let processedVideos = 0;

      console.log(`Total videos to process: ${totalVideos}`);

      for (const row of results) {
        const videoUrl = row.content;
        console.log(`\nProcessing video: ${videoUrl}`);

        try {
          console.log('Getting video duration...');
          const durationInSeconds = await getVideoDuration(videoUrl);
          const formattedDuration = formatDuration(durationInSeconds);

          console.log(`Updating video duration in database...`);
          updateVideoDuration(videoUrl, formattedDuration);

          console.log(`Processed video: ${videoUrl}`);
        } catch (err) {
          console.error(`Error processing ${videoUrl}: ${err}`);
        }

        processedVideos++;
        console.log(`Progress: ${(processedVideos / totalVideos * 100).toFixed(2)}% (${processedVideos}/${totalVideos})`);
      }

      console.log('\nFinished processing all videos.');
      connection.end();
    });
  } catch (err) {
    console.error('Error in main function:', err);
    connection.end();
  }
}

// Run the script
main();
