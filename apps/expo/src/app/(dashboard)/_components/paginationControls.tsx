import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export function PaginationControls({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (newPage: number) => void;
}) {
  if (totalPages === 1) return null;

  return (
    <SafeAreaView edges={["bottom"]} className="flex-row items-center justify-between border-t border-border">
      {page > 1 ? (
        <TouchableOpacity onPress={() => onPageChange(Math.max(1, page - 1))} className="px-8 py-4">
          <Text className="text-foreground text-center">Previous</Text>
        </TouchableOpacity>
      ) : (
        <View />
      )}

      {page < totalPages ? (
        <TouchableOpacity onPress={() => onPageChange(page + 1)} className="px-8 py-4">
          <Text className="text-foreground text-center">Next</Text>
        </TouchableOpacity>
      ) : (
        <View />
      )}
    </SafeAreaView>
  );
}
