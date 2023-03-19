const core = require('@actions/core');
const github = require('@actions/github');
const fs = require('fs');
const matter = require('gray-matter');
const { connected } = require('process');

async function checkFileExistence(path) {
  return fs.promises
    .access(path, fs.constants.F_OK)
    .then(() => {
      core.info(`${path} exists`);
      return true;
    })
    .catch(() => {
      core.setFailed(`${path} does not exist`);
      return false;
    });
}

/**
 * Returns frontmatter data from a filepath.
 *
 * @param path
 * @returns frontmatter
 */
const getFrontmatterFromPath = (path) => {
  const fileContents = fs.readFileSync(path, 'utf-8');
  return matter(fileContents);
};

// check if we should proceed with a auto merging of PR
// check if conditions are met for auto merging
const checkFrontmatterFields = async (filePath) => {
  const {
    data: { postedAt, status },
  } = getFrontmatterFromPath(filePath);

  // condition 1.
  // if status is 'scheduled post' - return true
  const isScheduledPost = status === 'scheduled post';

  // condition 2.
  // if postedAt has a date in the past from current date - return true
  const isPastPostedAt = new Date(postedAt) < new Date();

  if (isScheduledPost && isPastPostedAt) {
    core.info(`${filePath} is a scheduled for posting today`);
    return true;
  }

  core.setFailed('No scheduled postings for today');
  return false;
};

// create a function that checks if the file starts with a markdown header
async function checkFileStartsWithHeader(filePath) {
  return fs.promises.readFile(filePath, 'utf8').then((fileContent) => {
    // remove all empty lines ad the beginning of the file
    fileContent = fileContent.replace(/^\s*\n/gm, '');

    // we want to look at the front matter
    if (fileContent.startsWith('#')) {
      core.info(`File ${filePath} starts with a header`);
      return true;
    } else {
      core.setFailed(`File ${filePath} does not start with a header`);
      return false;
    }
  });
}

(async () => {
  try {
    const filePath = process.env.filePath; // ie. `_content/posts/_/2023-03-13_test.mdx`
    checkFrontmatterFields(filePath);
  } catch (error) {
    core.setFailed(error.message);
  }
})();
