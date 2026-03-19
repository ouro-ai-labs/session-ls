import React from "react";
import { Box, Text } from "ink";
import TextInput from "ink-text-input";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  isActive: boolean;
}

export function SearchBar({ value, onChange, isActive }: SearchBarProps) {
  return (
    <Box>
      <Text color="cyan" bold>
        Search:{" "}
      </Text>
      {isActive ? (
        <TextInput value={value} onChange={onChange} placeholder="type to filter sessions..." />
      ) : (
        <Text dimColor>{value || "type to filter sessions..."}</Text>
      )}
    </Box>
  );
}
