import fetch from 'node-fetch';
import async from 'async';

// qph player
fetch(
  'https://open.faceit.com/data/v4/players/a5d6fdbd-7d81-4857-83c0-6687f67d6bd5/history?game=csgo&offset=0&limit=100',
  {
    method: 'get',
    headers: { Authorization: 'Bearer 6ce9a64f-8859-4b08-bfdf-063b52a83782' },
  }
).then(async res => {
  const userMatches = (await res.json()).items;

  const mateIds = [
    '5788cc8f-7c0f-4335-9924-fc7350970351',
    '56d6559c-316c-471a-9aed-097c806c3f6f',
    'a2c93385-78cf-40fb-8a46-2b44e2c0f592',
    '1fcf0de2-9bf4-4ae1-8fdc-16592708afb4',
  ];

  const praccMatches = userMatches.filter(match => {
    return (
      match.playing_players.includes(mateIds[0]) &&
      match.playing_players.includes(mateIds[1]) &&
      match.playing_players.includes(mateIds[2]) &&
      match.playing_players.includes(mateIds[3])
    );
  });

  const results = {
    de_nuke: {
      win: 0,
      lose: 0,
    },
    de_inferno: {
      win: 0,
      lose: 0,
    },
    de_dust2: {
      win: 0,
      lose: 0,
    },
    de_mirage: {
      win: 0,
      lose: 0,
    },
    de_ancient: {
      win: 0,
      lose: 0,
    },
    de_vertigo: {
      win: 0,
      lose: 0,
    },
    de_overpass: {
      win: 0,
      lose: 0,
    },
  };

  async
    .forEachLimit(praccMatches, 20, async match => {
      const matchData = await fetch(`https://open.faceit.com/data/v4/matches/${match.match_id}/stats`, {
        method: 'get',
        headers: { Authorization: 'Bearer 6ce9a64f-8859-4b08-bfdf-063b52a83782' },
      });

      const map = (await matchData.json()).rounds[0].round_stats.Map;

      const isFaction1 = match.teams.faction1.players
        .map(({ player_id }) => player_id)
        .includes('a5d6fdbd-7d81-4857-83c0-6687f67d6bd5');

      const isFaction1Won = match.results.score.faction1;
      const teamHasWon = (isFaction1 && isFaction1Won) || (!isFaction1 && !isFaction1Won);

      teamHasWon ? results[map].win++ : results[map].lose++;
    })
    .then(() => {
      const mapNames = Object.keys(results);

      mapNames.forEach(map => {
        const currentMap = results[map];
        results[map] = {
          ...currentMap,
          winRate: currentMap.win === 0 ? 0 + '%' : (currentMap.win / (currentMap.win + currentMap.lose)) * 100 + '%',
        };
      });

      console.log(results);
    });
});
