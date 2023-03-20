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

/**
 * Returns frontmatter data from a filepath.
 *
 * @param path string
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
    data: { postDate, status },
  } = getFrontmatterFromPath(filePath);

  // condition 1.
  // if status is 'scheduled post' - return true
  const isScheduledPost = status === 'scheduled post';

  // condition 2.
  // if postedAt has a date in the past from current date - return true
  const isPastPostDate = new Date(postDate) < new Date();

  if (isScheduledPost && isPastPostDate) {
    core.info(`${filePath}: Scheduled for posting today`);
    return true;
  }

  core.setFailed('No scheduled postings for today');
  return false;
};

(async () => {
  try {
    /**
     * NOTE: Prior to entering this github action,
     *       I am using https://github.com/dorny/paths-filter/
     *       to filter the following:
     *       - only single file change in PR
     *       - change is an added file to an allowed folder
     *       - file is of .mdx filetype
     *
     *       when all these conditions are met, the filepath is
     *       passed into this action as an env var, filePath.
     */
    const filePath = process.env.filePath; // ie. `_content/posts/_/2023-03-13_test.mdx`
    checkFrontmatterFields(filePath);
  } catch (error) {
    core.setFailed(error.message);
  }
})();
