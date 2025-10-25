import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

function normaliseId(value) {
  if (value == null) return null
  return String(value)
}

function getStorageKey({ orgKey, competitionId, divisionId }) {
  const parts = [orgKey, competitionId, divisionId].map((value) =>
    value == null ? '' : String(value)
  )
  return `bc:favouriteTeams:${parts[0]}:${parts[1]}:${parts[2]}`
}

export default function useFavouriteTeams({ orgKey, competitionId, divisionId }) {
  const [favourites, setFavourites] = useState([])
  const storageMapRef = useRef(new Map())

  const storageKey = useMemo(
    () => getStorageKey({ orgKey, competitionId, divisionId }),
    [orgKey, competitionId, divisionId]
  )

  useEffect(() => {
    const key = storageKey
    if (!key) {
      setFavourites([])
      return
    }

    const fallbackValue = storageMapRef.current.get(key)
    if (fallbackValue) {
      setFavourites(fallbackValue)
    }

    if (typeof window === 'undefined') {
      return
    }

    try {
      const stored = window.localStorage.getItem(key)
      if (!stored) {
        setFavourites([])
        storageMapRef.current.set(key, [])
        return
      }
      const parsed = JSON.parse(stored)
      if (Array.isArray(parsed)) {
        const normalised = parsed
          .map((value) => normaliseId(value))
          .filter((value) => value != null)
        setFavourites(normalised)
        storageMapRef.current.set(key, normalised)
      } else {
        setFavourites([])
        storageMapRef.current.set(key, [])
      }
    } catch (error) {
      console.warn('Failed to load favourite teams from storage', error)
      setFavourites(fallbackValue || [])
    }
  }, [storageKey])

  useEffect(() => {
    const key = storageKey
    if (!key) {
      return
    }
    storageMapRef.current.set(key, favourites)

    if (typeof window === 'undefined') {
      return
    }

    try {
      window.localStorage.setItem(key, JSON.stringify(favourites))
    } catch (error) {
      console.warn('Failed to persist favourite teams', error)
    }
  }, [favourites, storageKey])

  const isFavourite = useCallback(
    (teamId) => {
      const normalised = normaliseId(teamId)
      if (normalised == null) return false
      return favourites.some((id) => id === normalised)
    },
    [favourites]
  )

  const setFavourite = useCallback((teamId, shouldBeFavourite) => {
    const normalised = normaliseId(teamId)
    if (normalised == null) {
      return
    }

    setFavourites((current) => {
      const exists = current.some((id) => id === normalised)
      if (shouldBeFavourite) {
        if (exists) {
          return current
        }
        return [...current, normalised]
      }
      if (!exists) {
        return current
      }
      return current.filter((id) => id !== normalised)
    })
  }, [])

  const toggleFavourite = useCallback(
    (teamId) => {
      const normalised = normaliseId(teamId)
      if (normalised == null) {
        return
      }
      setFavourites((current) => {
        if (current.some((id) => id === normalised)) {
          return current.filter((id) => id !== normalised)
        }
        return [...current, normalised]
      })
    },
    []
  )

  const clearAll = useCallback(() => {
    setFavourites([])
  }, [])

  return {
    favourites,
    isFavourite,
    toggleFavourite,
    setFavourite,
    clearAll
  }
}
