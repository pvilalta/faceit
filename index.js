import fetch from 'node-fetch';
import allTeams from './teams.js';

let apiKey = '065d12a6-7056-440b-aa76-06e2298141a7';
// let apiKey = '6ce9a64f-8859-4b08-bfdf-063b52a83782';

let nbOfPlayers = 5;
let teams = allTeams;

process.argv.forEach((value, index) => {
  if (index === 2 && value) nbOfPlayers = value;
  if (index === 3 && value) teams = [allTeams.find(team => team.name === value)];
});

const fetchGet = async url => {
  const res = await fetch(url, {
    method: 'get',
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  return res.json();
};

const getTeamStat = async team => {
  if (team.playerIds.length < nbOfPlayers) return;

  const teamMatches = await Promise.all(
    team.playerIds.map(id =>
      fetchGet(`https://open.faceit.com/data/v4/players/${id}/history?game=csgo&offset=0&limit=100`)
    )
  );

  let allMatches = [];

  teamMatches.forEach(match => (allMatches = allMatches.concat(match.items)));
  const uniqueAllMatches = allMatches.filter(
    (match, index, self) => self.findIndex(m => m.match_id === match.match_id) === index
  );

  const praccMatches = uniqueAllMatches.filter(match => {
    const matchedPlayers = match.playing_players.filter(player => team.playerIds.includes(player));
    return matchedPlayers.length >= nbOfPlayers;
  });

  const results = {};

  await Promise.all(
    praccMatches.map(async match => {
      const matchRawData = await fetchGet(`https://open.faceit.com/data/v4/matches/${match.match_id}/stats`);
      if (!matchRawData.rounds) return;

      const map = matchRawData.rounds[0].round_stats.Map;
      if (!results[map]) results[map] = { win: 0, lose: 0 };

      const isFaction1 = Boolean(
        match.teams.faction1.players
          .map(({ player_id }) => player_id)
          .find(playerId => team.playerIds.includes(playerId))
      );
      const hasFaction1Won = match.results.score.faction1;
      const teamHasWon = (isFaction1 && hasFaction1Won) || (!isFaction1 && !hasFaction1Won);

      teamHasWon ? results[map].win++ : results[map].lose++;
    })
  );

  const mapNames = Object.keys(results);
  mapNames.forEach(map => {
    const currentMap = results[map];
    results[map] = {
      ...currentMap,
      winRate:
        currentMap.win === 0 ? 0 + '%' : ((currentMap.win / (currentMap.win + currentMap.lose)) * 100).toFixed(0) + '%',
    };
  });
  console.log(team.name, results);

  // console.log('praccMatches', praccMatches);
};

teams.forEach(getTeamStat);
