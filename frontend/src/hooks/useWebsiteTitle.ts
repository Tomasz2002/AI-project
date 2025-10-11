import { useEffect } from "react";

type SetTitleFunction = (newTitle: string) => void;

export default function useWebsiteTitle(title: string): SetTitleFunction {
  const setTitle: SetTitleFunction = (newTitle) => {
    document.title = newTitle;
  };

  useEffect(() => {
    setTitle(title);
  }, [title]);

  return setTitle;
}
