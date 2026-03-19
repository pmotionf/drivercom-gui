export const prettierLabel = (label: string) => {
  const changeUpperCase = Array.from(label)
    .map((char, i) => {
      if (i === 0) return char.toUpperCase();
      else if (label[i - 1] === "_") return char.toUpperCase();
      else return char;
    })
    .join("");
  const replaceUnderScore = changeUpperCase.replaceAll("_", " ");
  return replaceUnderScore;
};
