import requests
from utils import dashify_uuid
from dotenv import load_dotenv
import os
from fastapi import HTTPException
from pydantic import BaseModel
from typing import Optional, List

load_dotenv()
mcci_api_key = os.getenv("mcci_api_key")

if mcci_api_key is None:
    raise RuntimeError("MCCI api key is unset")

class MCCIFriend(BaseModel):
    username: str
    uuid: str
    rank: Optional[str]

class MCCIStats(BaseModel):
    coins: Optional[int]
    royal_reputation: Optional[int]
    anglr_token: Optional[int]
    trophies: Optional[int]
    max_trophies: Optional[int]
    level: Optional[int]
    level_evolution: Optional[int]

class MCCIPlayer(BaseModel):
    uuid: str
    username: Optional[str]
    rank: Optional[str]
    online: bool
    first_join: Optional[str]
    last_join: Optional[str]
    friends: List[MCCIFriend]
    stats: Optional[MCCIStats]
    plus_subscribed: bool
    

query = """
query player($uuid: UUID!) {
  player(uuid: $uuid) {
    uuid
    username
    ranks
    status {
      online
      firstJoin
      lastJoin
    }
    social {
      friends {
        uuid
        username
        ranks
      }
    }
    collections {
      currency {
        coins
        royalReputation
        anglrTokens
      }
    }
    mccPlusStatus {
      evolution
      streakStart
      totalDays
    }
    crownLevel {
      levelData {
        level
        evolution
        nextEvolutionLevel
        nextLevelProgress {
          obtained
          obtainable
        }
      }
      fishingLevelData {
        level
        evolution
        nextEvolutionLevel
      }
      trophies {
        obtained
        obtainable
      }
    }
  }
}
"""

RANK_MAP = {
    "CHAMP": "Champ",
    "GRAND_CHAMP": "Grand Champ",
    "GRAND_CHAMP_ROYALE": "Grand Champ Royale",
    "GRAND_CHAMP_SUPREME": "Grand Champ Supreme",
    "CREATOR": "Creator",
    "CONTESTANT": "Contestant"
}

def get_rank(ranks: list) -> str | None:
    if ranks == []:
        return None
    else:
        try:
            return RANK_MAP[ranks[0]]
        except KeyError:
            return ranks[0]

def get_mcci_data(uuid):
    variables = {
    "uuid": dashify_uuid(uuid)
    }

    try:
        mcci_response_raw = requests.post("https://api.mccisland.net/graphql", json={"query": query, "variables": variables}, headers={"X-API-Key": mcci_api_key})
        mcci_response_raw.raise_for_status()
        mcci_response: dict = mcci_response_raw.json()

    except requests.exceptions.HTTPError as e:
        print(f"http exception for mcci api: {e}")
        raise HTTPException(502, {"message": "recieved HTTP error from MCC Island api"})
    
    except Exception as e:
        print(f"unknown error for mcci api: {e}")
        raise HTTPException(500, {"message": "something went wrong while proccessing MCC Island api data"})
    
    if mcci_response['data'] == {}:
        raise HTTPException(404, {"message": "player was not found"})

    rank = get_rank(mcci_response['data']['player']['ranks'])

    player: dict = mcci_response.get('data', {}).get('player', {})

    status = player.get('status')
    if status is not None:
        online = status.get('online')
        first_join = status.get('firstJoin')
        last_join = status.get('lastJoin')
    else:
        online = False
        first_join = None
        last_join = None

    friends = player.get('social', {}).get('friends')

    player_friends = []
    if friends is not None:
        for friend in friends:
            player_friends.append(
                MCCIFriend(
                    uuid=friend['uuid'],
                    username=friend['username'],
                    rank=get_rank(friend['ranks'])
                )
            )

    currency: dict = player.get('collections', {}).get('currency', {})
    crown_level: dict = player.get('crownLevel', {})
    trophies: dict = crown_level.get('trophies', {})
    level_data: dict = crown_level.get('levelData', {})

    player_stats = MCCIStats(
        coins=currency.get('coins'),
        royal_reputation=currency.get('royalReputation'),
        anglr_token=currency.get('anglrTokens'),
        trophies=trophies.get('obtained'),
        max_trophies=trophies.get('obtainable'),
        level=level_data.get('level'),
        level_evolution=level_data.get('evolution')
    )

    mcc_plus = player.get('mccPlusStatus')
    if mcc_plus is not None:
        plus_subscribed = True
    else:
        plus_subscribed = False

    player_response = MCCIPlayer(
        uuid=player.get('uuid'),
        username=player.get('username'),
        rank=rank,
        online=online,
        first_join=first_join,
        last_join=last_join,
        friends=player_friends,
        stats=player_stats,
        plus_subscribed=plus_subscribed
    )
    return player_response


if __name__ == "__main__":
    # data = get_mcci_data("03fa539c41d34b86b0f47a0d695757e7")
    # good testing uuid 03fa539c41d34b86b0f47a0d695757e7
    data = get_mcci_data("069a79f444e94726a5befca90e38aaf5")
    print(data)