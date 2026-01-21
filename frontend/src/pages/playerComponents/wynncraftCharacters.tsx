import { useState } from "react";
import "./wynncraftCharacters.css";
import { CharacterInfo, ProfessionInfo } from "../../client";
import { Select } from "radix-ui";
import WynncraftCharacterModal from "./wynncraftCharacterModal";

function WynncraftCharacters({
  characterList,
}: {
  characterList: CharacterInfo[];
}) {
  if (characterList.length === 0) {
    return <p>This player has no characters.</p>;
  }

  const getTotalProfessionLevel = (professions: ProfessionInfo) => {
    return Object.values(professions).reduce(
      (sum: number, level: number) => sum + level,
      0,
    );
  };

  const [sort, setSort] = useState<string>("playtime");
  let characters;

  switch (sort) {
    case "playtime":
      characters = [...characterList]
        .sort((charOne, charTwo) => charOne.playtime - charTwo.playtime)
        .reverse();
      break;
    case "level":
      characters = [...characterList]
        .sort((charOne, charTwo) => charOne.level - charTwo.level)
        .reverse();
      break;
    case "age":
      characters = [...characterList];
      break;
    case "logins":
      characters = [...characterList]
        .sort((charOne, charTwo) => charOne.logins - charTwo.logins)
        .reverse();
      break;
    case "professions":
      characters = [...characterList]
        .sort(
          (charOne, charTwo) =>
            getTotalProfessionLevel(charOne.professions) -
            getTotalProfessionLevel(charTwo.professions),
        )
        .reverse();
      break;
    default:
      console.error(
        `invalid sorting type selected for wynncraft characters: ${sort}`,
      );
      characters = [...characterList];
      break;
  }

  return (
    <>
      <Select.Root value={sort} onValueChange={setSort}>
        <div className="wynn-sort-trigger">
          Sort by
          <Select.Trigger className="SelectTrigger">
            <Select.Value placeholder="Sort by..." />
          </Select.Trigger>
        </div>
        <Select.Portal>
          <Select.Content className="SelectContent" position="popper">
            <Select.Viewport className="SelectViewport">
              <Select.Item value="playtime" className="SelectItem">
                <Select.ItemText>Playtime</Select.ItemText>
              </Select.Item>
              <Select.Item value="level" className="SelectItem">
                <Select.ItemText>Level</Select.ItemText>
              </Select.Item>
              <Select.Item value="age" className="SelectItem">
                <Select.ItemText>Character Age</Select.ItemText>
              </Select.Item>
              <Select.Item value="logins" className="SelectItem">
                <Select.ItemText>Logins</Select.ItemText>
              </Select.Item>
              <Select.Item value="professions" className="SelectItem">
                <Select.ItemText>Professions</Select.ItemText>
              </Select.Item>
            </Select.Viewport>
          </Select.Content>
        </Select.Portal>
      </Select.Root>
      <ul className="wynncraft-character-list">
        {characters.map((char) => (
          <WynncraftCharacterModal character={char} key={char.character_uuid} />
        ))}
      </ul>
    </>
  );
}

export default WynncraftCharacters;
