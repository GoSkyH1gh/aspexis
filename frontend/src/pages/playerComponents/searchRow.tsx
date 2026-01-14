import React, { useState } from "react";
import { motion } from "motion/react";
import { useNavigate } from "react-router-dom";
import { Icon } from "@iconify/react";

type SearchbarProps = {
  handleInputChange: (input: any) => void;
  inputValue: string;
  handleKeyPress: (keyPress: any) => void;
};

function Searchbar({
  handleInputChange,
  inputValue,
  handleKeyPress,
}: SearchbarProps) {
  return (
    <>
      <label className="visually-hidden" htmlFor="search">
        Search by username or UUID
      </label>
      <motion.input
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeInOut" }}
        type="text"
        placeholder="search by username or UUID"
        className="searchbar"
        name="search"
        onChange={handleInputChange}
        value={inputValue}
        onKeyDown={handleKeyPress}
      />
    </>
  );
}

type SearchButtonProps = {
  onClick: () => void;
  disabled?: boolean;
};

function SearchButtonProps({ onClick, disabled }: SearchButtonProps) {
  return (
    <motion.button
      className="search-button"
      onClick={onClick}
      disabled={disabled}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeInOut", delay: 0.2 }}
      aria-label="Search"
    >
      <Icon icon="material-symbols:search-rounded"/>
    </motion.button>
  );
}

type SearchRow = {
  disabled?: boolean;
  urlToNavigate: string;
};

function SearchRow({ disabled, urlToNavigate }: SearchRow) {
  let navigate = useNavigate();
  const [inputValue, setInputValue] = useState("");
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleSearchClick = () => {
    if (!disabled) {
      navigate(`${urlToNavigate}/${encodeURIComponent(inputValue.trim())}`);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearchClick();
    }
  };
  return (
    <div className="search-row">
      <Searchbar
        handleInputChange={handleInputChange}
        inputValue={inputValue}
        handleKeyPress={handleKeyPress}
      />
      <SearchButtonProps onClick={handleSearchClick} disabled={disabled} />
    </div>
  );
}

export default SearchRow;
