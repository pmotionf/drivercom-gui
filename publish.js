module.exports = async ({github, context}) => {
  const {SHA} = process.env;
  const fs = require('fs').promises;
  const org = 'pmotionf';
  const name = 'drivercom-gui';

  // Parse `build.zig.zon` for version
  var version;
  const raw = await fs.readFile('build.zig.zon');
  const lines = raw.split('\n');
  lines.forEach((line) => {
    line = line.trim();
    if (line.startsWith('.version')) {
      const parts = line.split('=');
      const version_raw = parts[1];
      const version_cleaned = version_raw.replace('"', '').replace(',', '');
      version = version_cleaned.trim();
    }
  });

  // Check if already released
  const releases = await github.rest.git.listMatchingRefs({
    owner: org,
    repo: name,
    ref: 'tags/' + version,
  });
  if (releases.length > 0) return;

  // Create release
  await github.rest.repos.createRelease({
    owner: org,
    repo: name,
    name: version,
    tag_name: version,
    generate_release_notes: true,
  });

  github.request('POST /repos/{owner}/{repo}/releases/{release_id}/assets{?name,label}', {
    owner: org,
    repo: name,
    release_id: version,
    data: await fs.readFile('zig-out/bin/' + name),
    headers: {
      'X-GitHub-Api-Version': '2022-11-28'
    }
  });
  github.request('POST /repos/{owner}/{repo}/releases/{release_id}/assets{?name,label}', {
    owner: org,
    repo: name,
    release_id: version,
    data: await fs.readFile('zig-out/bin/' + name + '.exe'),
    headers: {
      'X-GitHub-Api-Version': '2022-11-28'
    }
  });
}
