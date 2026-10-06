import { useEffect, useState } from 'react'
import {
  Link,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useSearchParams,
} from 'react-router-dom'

const API_KEY = import.meta.env.VITE_TMDB_API_KEY
const API_BASE = 'https://api.themoviedb.org/3'
const IMAGE_BASE = 'https://image.tmdb.org/t/p/w500'
const BACKDROP_BASE = 'https://image.tmdb.org/t/p/w1280'

const apiFetch = async (path, params = {}) => {
  if (!API_KEY || API_KEY === 'YOUR_TMDB_API_KEY') {
    throw new Error('TMDB API key is missing. Add VITE_TMDB_API_KEY in the environment variables.')
  }

  const query = new URLSearchParams({
    api_key: API_KEY,
    language: 'en-US',
    ...params,
  })

  const response = await fetch(`${API_BASE}${path}?${query}`)
  if (!response.ok) {
    throw new Error('Unable to load movie data.')
  }
  return response.json()
}

const getImage = (path, fallback = '') =>
  path ? `${IMAGE_BASE}${path}` : fallback

const getBackdrop = (path) =>
  path ? `${BACKDROP_BASE}${path}` : ''

const formatDate = (date) => {
  if (!date) return 'Release date unavailable'
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

const truncate = (text, length = 130) => {
  if (!text) return 'No overview available.'
  return text.length > length ? `${text.slice(0, length).trim()}...` : text
}

function App() {
  return (
    <>
      <Navbar />
      <main className="app-main">
        <Routes>
          <Route path="/" element={<MovieListPage type="popular" title="Popular Movies" />} />
          <Route path="/popular" element={<MovieListPage type="popular" title="Popular Movies" />} />
          <Route path="/top-rated" element={<MovieListPage type="top_rated" title="Top Rated Movies" />} />
          <Route path="/upcoming" element={<MovieListPage type="upcoming" title="Upcoming Movies" />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/movie/:movieId" element={<MovieDetailsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <Footer />
    </>
  )
}

function Navbar() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchText, setSearchText] = useState('')

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    setSearchText(params.get('query') || '')
  }, [location.search])

  const submitSearch = (event) => {
    event.preventDefault()
    const value = searchText.trim()
    if (value) {
      navigate(`/search?query=${encodeURIComponent(value)}&page=1`)
    }
  }

  return (
    <header className="navbar">
      <div className="nav-inner">
        <button className="brand" onClick={() => navigate('/')}>
          <span className="brand-icon">▶</span>
          <span>Movie<span>Hub</span></span>
        </button>

        <nav className="nav-links">
          <NavItem to="/" label="Popular" active={location.pathname === '/' || location.pathname === '/popular'} />
          <NavItem to="/top-rated" label="Top Rated" active={location.pathname === '/top-rated'} />
          <NavItem to="/upcoming" label="Upcoming" active={location.pathname === '/upcoming'} />
        </nav>

        <form className="search-form" onSubmit={submitSearch}>
          <input
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            placeholder="Search movies..."
            aria-label="Search movies"
          />
          <button type="submit" aria-label="Search">⌕</button>
        </form>
      </div>
    </header>
  )
}

function NavItem({ to, label, active }) {
  return (
    <Link className={active ? 'nav-item active' : 'nav-item'} to={to}>
      {label}
    </Link>
  )
}

function MovieListPage({ type, title }) {
  const [searchParams, setSearchParams] = useSearchParams()
  const page = Math.max(1, Number(searchParams.get('page')) || 1)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')

    apiFetch(`/movie/${type}`, { page })
      .then((result) => {
        if (!cancelled) setData(result)
      })
      .catch((err) => {
        if (!cancelled) setError(err.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [type, page])

  const changePage = (nextPage) => {
    if (nextPage < 1) return
    setSearchParams({ page: String(nextPage) })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <section className="page-section">
      <PageHeading title={title} subtitle="Discover movies worth watching." />

      {loading && <Loader />}
      {error && <ErrorBox message={error} />}

      {!loading && !error && (
        <>
          <MovieGrid movies={data?.results || []} />
          <Pagination
            page={page}
            totalPages={Math.min(data?.total_pages || 1, 500)}
            onChange={changePage}
          />
        </>
      )}
    </section>
  )
}

function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const query = searchParams.get('query')?.trim() || ''
  const page = Math.max(1, Number(searchParams.get('page')) || 1)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!query) {
      setData({ results: [], total_pages: 0 })
      return
    }

    let cancelled = false
    setLoading(true)
    setError('')

    apiFetch('/search/movie', { query, page })
      .then((result) => {
        if (!cancelled) setData(result)
      })
      .catch((err) => {
        if (!cancelled) setError(err.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [query, page])

  if (!query) {
    return (
      <section className="empty-search">
        <div className="empty-icon">⌕</div>
        <h1>Search for a movie</h1>
        <p>Use the search bar above to find your favorite movies.</p>
      </section>
    )
  }

  const changePage = (nextPage) => {
    setSearchParams({ query, page: String(nextPage) })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <section className="page-section">
      <PageHeading title={`Search results for "${query}"`} subtitle="Movies matching your search." />

      {loading && <Loader />}
      {error && <ErrorBox message={error} />}

      {!loading && !error && (
        <>
          {data?.results?.length ? (
            <>
              <MovieGrid movies={data.results} />
              <Pagination
                page={page}
                totalPages={Math.min(data.total_pages || 1, 500)}
                onChange={changePage}
              />
            </>
          ) : (
            <div className="no-results">
              <div className="empty-icon">☹</div>
              <h2>No movies found</h2>
              <p>Try another movie name.</p>
            </div>
          )}
        </>
      )}
    </section>
  )
}

function MovieDetailsPage() {
  const { movieId } = useMovieParams()
  const [movie, setMovie] = useState(null)
  const [cast, setCast] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')

    Promise.all([
      apiFetch(`/movie/${movieId}`),
      apiFetch(`/movie/${movieId}/credits`),
    ])
      .then(([movieData, creditData]) => {
        if (!cancelled) {
          setMovie(movieData)
          setCast((creditData.cast || []).slice(0, 12))
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [movieId])

  if (loading) return <Loader />
  if (error) return <ErrorBox message={error} />
  if (!movie) return null

  return (
    <section className="details-page">
      <div
        className="hero-backdrop"
        style={{ backgroundImage: `linear-gradient(90deg, rgba(7,9,18,.98) 0%, rgba(7,9,18,.87) 42%, rgba(7,9,18,.5) 100%), url(${getBackdrop(movie.backdrop_path)})` }}
      >
        <div className="hero-content">
          <img
            className="detail-poster"
            src={getImage(movie.poster_path)}
            alt={movie.title}
          />
          <div className="detail-copy">
            <div className="eyebrow">MOVIE DETAILS</div>
            <h1>{movie.title}</h1>
            {movie.tagline && <p className="tagline">“{movie.tagline}”</p>}

            <div className="meta-row">
              <span className="rating">★ {movie.vote_average?.toFixed(1)}</span>
              <span>{formatDate(movie.release_date)}</span>
              <span>{movie.runtime ? `${movie.runtime} min` : 'Runtime N/A'}</span>
            </div>

            <div className="genre-list">
              {(movie.genres || []).map((genre) => (
                <span key={genre.id}>{genre.name}</span>
              ))}
            </div>

            <p className="overview">{movie.overview || 'No overview available.'}</p>

            <div className="detail-info">
              <InfoItem label="Language" value={(movie.original_language || 'en').toUpperCase()} />
              <InfoItem label="Status" value={movie.status || 'Unknown'} />
              <InfoItem label="Popularity" value={movie.popularity?.toFixed(0) || 'N/A'} />
            </div>
          </div>
        </div>
      </div>

      <section className="cast-section">
        <PageHeading title="Top Cast" subtitle="Meet the cast behind the movie." />
        <div className="cast-grid">
          {cast.map((person) => (
            <CastCard key={`${person.id}-${person.cast_id || person.credit_id}`} person={person} />
          ))}
        </div>
      </section>
    </section>
  )
}

function useMovieParams() {
  const location = useLocation()
  return { movieId: location.pathname.split('/').filter(Boolean).pop() }
}

function InfoItem({ label, value }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function MovieGrid({ movies }) {
  return (
    <div className="movie-grid">
      {movies.map((movie) => (
        <MovieCard key={movie.id} movie={movie} />
      ))}
    </div>
  )
}

function MovieCard({ movie }) {
  const navigate = useNavigate()

  return (
    <article className="movie-card" onClick={() => navigate(`/movie/${movie.id}`)}>
      <div className="poster-wrap">
        <img
          src={getImage(movie.poster_path)}
          alt={movie.title}
          loading="lazy"
        />
        <span className="movie-rating">★ {movie.vote_average?.toFixed(1) || 'N/A'}</span>
        <button className="view-button" aria-label={`View ${movie.title}`}>View Details</button>
      </div>
      <div className="movie-card-body">
        <h3>{movie.title}</h3>
        <p>{formatDate(movie.release_date)}</p>
        <p className="movie-overview">{truncate(movie.overview)}</p>
      </div>
    </article>
  )
}

function CastCard({ person }) {
  return (
    <article className="cast-card">
      {person.profile_path ? (
        <img
          src={getImage(person.profile_path)}
          alt={person.name}
          loading="lazy"
        />
      ) : (
        <div className="cast-placeholder">No Image</div>
      )}
      <div className="cast-body">
        <h3>{person.name}</h3>
        <p>{person.character || 'Cast member'}</p>
      </div>
    </article>
  )
}

function PageHeading({ title, subtitle }) {
  return (
    <div className="page-heading">
      <div>
        <span className="section-label">MOVIE COLLECTION</span>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
    </div>
  )
}

function Pagination({ page, totalPages, onChange }) {
  const visiblePages = []
  const start = Math.max(1, page - 2)
  const end = Math.min(totalPages, page + 2)

  for (let i = start; i <= end; i += 1) {
    visiblePages.push(i)
  }

  return (
    <div className="pagination">
      <button disabled={page === 1} onClick={() => onChange(page - 1)}>←</button>
      {start > 1 && (
        <>
          <button onClick={() => onChange(1)}>1</button>
          {start > 2 && <span>...</span>}
        </>
      )}
      {visiblePages.map((number) => (
        <button
          key={number}
          className={number === page ? 'selected' : ''}
          onClick={() => onChange(number)}
        >
          {number}
        </button>
      ))}
      {end < totalPages && (
        <>
          {end < totalPages - 1 && <span>...</span>}
          <button onClick={() => onChange(totalPages)}>{totalPages}</button>
        </>
      )}
      <button disabled={page === totalPages} onClick={() => onChange(page + 1)}>→</button>
    </div>
  )
}

function Loader() {
  return (
    <div className="loader-wrap">
      <div className="spinner" />
      <p>Loading movies...</p>
    </div>
  )
}

function ErrorBox({ message }) {
  return (
    <div className="error-box">
      <h2>Something went wrong</h2>
      <p>{message}</p>
      <p>Check your TMDB API key and internet connection.</p>
    </div>
  )
}

function Footer() {
  return (
    <footer className="footer">
      <div>
        <strong>MovieHub</strong>
        <p>Discover popular, top-rated and upcoming movies.</p>
      </div>
      <p>Powered by TMDB API</p>
    </footer>
  )
}

export default App
