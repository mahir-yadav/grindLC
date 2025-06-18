import { useState, useEffect } from 'react';
import { fetchProblems } from '../api/problems';

const unique = (arr) => Array.from(new Set(arr.filter(Boolean)));

const DIFFICULTY_COLORS = {
    easy: 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/50',
    medium: 'text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/50',
    hard: 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/50',
    unknown: 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-800/50',
};

const getDifficultyColor = (difficulty) => {
    if (!difficulty) return DIFFICULTY_COLORS.unknown;
    const diff = String(difficulty).toLowerCase();
    return DIFFICULTY_COLORS[diff] || DIFFICULTY_COLORS.unknown;
};

const Problems = () => {
    const [problems, setProblems] = useState([]);
    const [filteredProblems, setFilteredProblems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [sortConfig, setSortConfig] = useState({ key: 'rating', direction: 'desc' });
    const [search, setSearch] = useState('');
    const [companyFilter, setCompanyFilter] = useState('');
    const [difficultyFilter, setDifficultyFilter] = useState('');
    const [topicFilter, setTopicFilter] = useState('');
    const [ratingRange, setRatingRange] = useState({ min: '', max: '' });
    const [completedProblems, setCompletedProblems] = useState(() => {
        const saved = localStorage.getItem('completedProblems');
        return saved ? JSON.parse(saved) : [];
    });
    const [darkMode, setDarkMode] = useState(() => {
        const saved = localStorage.getItem('darkMode');
        if (saved !== null) return JSON.parse(saved);
        return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    });
    const [currentPage, setCurrentPage] = useState(1);
    const problemsPerPage = 50;
    const [expandedTags, setExpandedTags] = useState({});
    const initialTagsToShow = 3;
    const [stats, setStats] = useState({ total: 0, completed: 0 });
    const [showTopics, setShowTopics] = useState(false);
    const [feedback, setFeedback] = useState('');

    // Apply dark mode class to document
    useEffect(() => {
        if (darkMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
        localStorage.setItem('darkMode', JSON.stringify(darkMode));
    }, [darkMode]);

    // Save completed problems to localStorage
    useEffect(() => {
        localStorage.setItem('completedProblems', JSON.stringify(completedProblems));
        setStats({
            total: problems.length,
            completed: completedProblems.length
        });
    }, [completedProblems, problems]);

    // Fetch problems from API
    useEffect(() => {
        const loadProblems = async () => {
            try {
                const data = await fetchProblems();
                if (!Array.isArray(data)) throw new Error('Invalid data format received from API');

                const validProblems = data.map((problem) => ({
                    ...problem,
                    difficulty: problem.difficulty || 'Unknown',
                    topics: Array.isArray(problem.topics) ? problem.topics : Array.isArray(problem.tags) ? problem.tags : [],
                    companies: Array.isArray(problem.companies) ? problem.companies : [],
                    rating: typeof problem.rating === 'number' ? problem.rating : 0,
                    title: problem.title || 'Untitled',
                    id: problem.id || 'N/A',
                }));

                setProblems(validProblems);
                setLoading(false);
            } catch (err) {
                setError(err.message);
                setLoading(false);
            }
        };
        loadProblems();
    }, []);

    // Filter and sort problems
    useEffect(() => {
        let filtered = problems;

        // Clean data
        filtered = filtered.map((problem) => ({
            ...problem,
            id: String(problem.id || '').trim(),
            title: String(problem.title || '').trim(),
            difficulty: String(problem.difficulty || 'unknown').toLowerCase().trim(),
            rating: Number(problem.rating) || 0,
            topics: Array.isArray(problem.topics) ? problem.topics.map(t => String(t).trim()) : [],
            companies: Array.isArray(problem.companies) ? problem.companies.map(c => String(c).trim()) : []
        }));

        // Apply filters
        if (search) {
            const s = search.toLowerCase().trim();
            filtered = filtered.filter(
                (p) =>
                    p.title.toLowerCase().includes(s) ||
                    p.companies.some((c) => c.toLowerCase().includes(s)) ||
                    p.topics.some((t) => t.toLowerCase().includes(s))
            );
        }

        if (companyFilter) {
            const company = companyFilter.trim();
            filtered = filtered.filter((p) =>
                p.companies.some(c => c.toLowerCase() === company.toLowerCase())
            );
        }

        if (difficultyFilter) {
            const difficulty = difficultyFilter.toLowerCase().trim();
            filtered = filtered.filter((p) => p.difficulty === difficulty);
        }

        if (topicFilter) {
            const topic = topicFilter.trim();
            filtered = filtered.filter((p) =>
                p.topics.some(t => t.toLowerCase() === topic.toLowerCase())
            );
        }

        if (ratingRange.min !== '' || ratingRange.max !== '') {
            const minRating = ratingRange.min !== '' ? Number(ratingRange.min) : 0;
            const maxRating = ratingRange.max !== '' ? Number(ratingRange.max) : Infinity;

            filtered = filtered.filter((p) => {
                const rating = Number(p.rating);
                return !isNaN(rating) && rating >= minRating && rating <= maxRating;
            });
        }

        // Apply sorting
        if (sortConfig.key) {
            filtered.sort((a, b) => {
                if (sortConfig.key === 'difficulty') {
                    const order = { easy: 1, medium: 2, hard: 3, unknown: 4 };
                    const aDiff = a.difficulty;
                    const bDiff = b.difficulty;
                    return sortConfig.direction === 'asc'
                        ? order[aDiff] - order[bDiff]
                        : order[bDiff] - order[aDiff];
                }

                if (sortConfig.key === 'rating') {
                    const aRating = Number(a.rating) || 0;
                    const bRating = Number(b.rating) || 0;
                    return sortConfig.direction === 'asc'
                        ? aRating - bRating
                        : bRating - aRating;
                }

                if (sortConfig.key === 'id') {
                    const aNum = parseInt(a.id) || 0;
                    const bNum = parseInt(b.id) || 0;
                    return sortConfig.direction === 'asc'
                        ? aNum - bNum
                        : bNum - aNum;
                }

                const aValue = String(a[sortConfig.key] || '').toLowerCase();
                const bValue = String(b[sortConfig.key] || '').toLowerCase();
                return sortConfig.direction === 'asc'
                    ? aValue.localeCompare(bValue)
                    : bValue.localeCompare(aValue);
            });
        }

        setFilteredProblems(filtered);
        setCurrentPage(1); // Reset to first page when filters change
    }, [problems, search, companyFilter, difficultyFilter, topicFilter, ratingRange, sortConfig]);

    const toggleCompleted = (problemId) => {
        setCompletedProblems(prev => {
            if (prev.includes(problemId)) {
                return prev.filter(id => id !== problemId);
            } else {
                return [...prev, problemId];
            }
        });
    };

    const toggleTags = (problemId, type) => {
        setExpandedTags(prev => ({
            ...prev,
            [`${problemId}-${type}`]: !prev[`${problemId}-${type}`]
        }));
    };

    const resetFilters = () => {
        setSearch('');
        setCompanyFilter('');
        setDifficultyFilter('');
        setTopicFilter('');
        setRatingRange({ min: '', max: '' });
        setSortConfig({ key: 'rating', direction: 'desc' });
    };

    const allCompanies = unique(problems.flatMap((p) => p.companies)).sort();
    const allDifficulties = unique(problems.map((p) => String(p.difficulty).toLowerCase()));
    const allTopics = unique(problems.flatMap((p) => p.topics)).sort();

    // Pagination
    const indexOfLastProblem = currentPage * problemsPerPage;
    const indexOfFirstProblem = indexOfLastProblem - problemsPerPage;
    const currentProblems = filteredProblems.slice(indexOfFirstProblem, indexOfLastProblem);
    const totalPages = Math.ceil(filteredProblems.length / problemsPerPage);

    const getPageNumbers = () => {
        const pageNumbers = [];
        const maxPagesToShow = 5;

        if (totalPages <= maxPagesToShow) {
            for (let i = 1; i <= totalPages; i++) {
                pageNumbers.push(i);
            }
        } else {
            if (currentPage <= 3) {
                for (let i = 1; i <= 4; i++) {
                    pageNumbers.push(i);
                }
                pageNumbers.push('...');
                pageNumbers.push(totalPages);
            } else if (currentPage >= totalPages - 2) {
                pageNumbers.push(1);
                pageNumbers.push('...');
                for (let i = totalPages - 3; i <= totalPages; i++) {
                    pageNumbers.push(i);
                }
            } else {
                pageNumbers.push(1);
                pageNumbers.push('...');
                for (let i = currentPage - 1; i <= currentPage + 1; i++) {
                    pageNumbers.push(i);
                }
                pageNumbers.push('...');
                pageNumbers.push(totalPages);
            }
        }
        return pageNumbers;
    };

    const handleFeedbackSubmit = async () => {
        try {
            const response = await fetch('http://localhost:3002/api/feedback/submit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ message: feedback })
            });

            if (!response.ok) {
                throw new Error('Failed to submit feedback');
            }

            const data = await response.json();
            alert(`Feedback submitted successfully! (${data.totalFeedbacks}/20 feedbacks stored)`);
            setFeedback('');
        } catch (error) {
            console.error('Error submitting feedback:', error);
            alert('Failed to submit feedback. Please try again.');
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen dark:bg-gray-900">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex justify-center items-center min-h-screen dark:bg-gray-900">
                <div className="max-w-md p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
                    <h2 className="text-xl font-bold text-red-500 mb-4">Error Loading Problems</h2>
                    <p className="text-gray-700 dark:text-gray-300 mb-4">{error}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                    >
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen w-full bg-gray-50 dark:bg-gray-900 flex flex-col">
            <div className="w-full max-w-7xl mx-auto">
                {/* Navbar */}
                <nav className="bg-white dark:bg-gray-800 shadow-lg sticky top-0 z-50 flex items-center justify-between px-4 py-3 rounded-lg mb-6">
                    <div className="flex items-center gap-4">
                        <span className="text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                            </svg>
                            GrindLC
                        </span>
                        <div className="hidden md:flex items-center space-x-2 text-sm">
                            <span className="px-2 py-1 bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 rounded-full">
                                {stats.completed} / {stats.total} solved
                            </span>
                            <div className="w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                                <div
                                    className="bg-green-500 h-2.5 rounded-full"
                                    style={{ width: `${stats.total ? (stats.completed / stats.total) * 100 : 0}%` }}
                                ></div>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setDarkMode((prev) => !prev)}
                            className="p-2 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                            aria-label="Toggle dark mode"
                        >
                            {darkMode ? (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                                </svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                                </svg>
                            )}
                        </button>
                    </div>
                </nav>

                {/* Filters Section */}
                <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6 mb-6">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                            Problem Filters
                        </h2>
                        <div className="flex gap-2">
                            <button
                                onClick={resetFilters}
                                className="px-3 py-1 text-sm font-semibold rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-600"
                            >
                                Reset All
                            </button>
                            <button
                                onClick={() => setShowTopics((prev) => !prev)}
                                className="px-3 py-1 text-sm font-semibold rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-600"
                            >
                                {showTopics ? 'Hide Topics' : 'Show Topics'}
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Search
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                </div>
                                <input
                                    type="text"
                                    placeholder="Search problems..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Company
                            </label>
                            <select
                                value={companyFilter}
                                onChange={(e) => setCompanyFilter(e.target.value)}
                                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
                            >
                                <option value="">All Companies</option>
                                {allCompanies.map((company) => (
                                    <option key={company} value={company}>{company}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Difficulty
                            </label>
                            <select
                                value={difficultyFilter}
                                onChange={(e) => setDifficultyFilter(e.target.value)}
                                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
                            >
                                <option value="">All Difficulties</option>
                                {allDifficulties.map((diff) => (
                                    <option key={diff} value={diff}>{diff.charAt(0).toUpperCase() + diff.slice(1)}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Topic
                            </label>
                            <select
                                value={topicFilter}
                                onChange={(e) => setTopicFilter(e.target.value)}
                                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
                            >
                                <option value="">All Topics</option>
                                {allTopics.map((topic) => (
                                    <option key={topic} value={topic}>{topic}</option>
                                ))}
                            </select>
                        </div>
                        <div className="lg:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Rating Range
                            </label>
                            <div className="flex items-center gap-4">
                                <div className="flex-1 flex items-center gap-2">
                                    <input
                                        type="number"
                                        placeholder="Min"
                                        value={ratingRange.min}
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            if (value === '' || (parseInt(value) >= 0 && parseInt(value) <= 3000)) {
                                                setRatingRange(prev => ({ ...prev, min: value }));
                                            }
                                        }}
                                        className="flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
                                    />
                                    <span className="text-gray-500 dark:text-gray-400">to</span>
                                    <input
                                        type="number"
                                        placeholder="Max"
                                        value={ratingRange.max}
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            if (value === '' || (parseInt(value) >= 0 && parseInt(value) <= 3000)) {
                                                setRatingRange(prev => ({ ...prev, max: value }));
                                            }
                                        }}
                                        className="flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Problems Table */}
                <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full table-auto border-separate border-spacing-0">
                            <thead className="bg-gray-50 dark:bg-gray-700">
                                <tr>
                                    <th
                                        scope="col"
                                        className="sticky top-0 px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-200 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                                        onClick={() => setSortConfig(prev => ({
                                            key: 'id',
                                            direction: prev.key === 'id' && prev.direction === 'asc' ? 'desc' : 'asc'
                                        }))}
                                    >
                                        <div className="flex items-center">
                                            ID
                                            {sortConfig.key === 'id' && (
                                                <span className="ml-1">
                                                    {sortConfig.direction === 'asc' ? (
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                            <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                                                        </svg>
                                                    ) : (
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                                        </svg>
                                                    )}
                                                </span>
                                            )}
                                        </div>
                                    </th>
                                    <th
                                        scope="col"
                                        className="sticky top-0 px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-200 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                                        onClick={() => setSortConfig(prev => ({
                                            key: 'title',
                                            direction: prev.key === 'title' && prev.direction === 'asc' ? 'desc' : 'asc'
                                        }))}
                                    >
                                        <div className="flex items-center">
                                            Title
                                            {sortConfig.key === 'title' && (
                                                <span className="ml-1">
                                                    {sortConfig.direction === 'asc' ? (
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                            <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                                                        </svg>
                                                    ) : (
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                                        </svg>
                                                    )}
                                                </span>
                                            )}
                                        </div>
                                    </th>
                                    <th
                                        scope="col"
                                        className="sticky top-0 px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-200 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                                        onClick={() => setSortConfig(prev => ({
                                            key: 'difficulty',
                                            direction: prev.key === 'difficulty' && prev.direction === 'asc' ? 'desc' : 'asc'
                                        }))}
                                    >
                                        <div className="flex items-center">
                                            Difficulty
                                            {sortConfig.key === 'difficulty' && (
                                                <span className="ml-1">
                                                    {sortConfig.direction === 'asc' ? (
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                            <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                                                        </svg>
                                                    ) : (
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                                        </svg>
                                                    )}
                                                </span>
                                            )}
                                        </div>
                                    </th>
                                    <th
                                        scope="col"
                                        className="sticky top-0 px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-200 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                                        onClick={() => setSortConfig(prev => ({
                                            key: 'rating',
                                            direction: prev.key === 'rating' && prev.direction === 'asc' ? 'desc' : 'asc'
                                        }))}
                                    >
                                        <div className="flex items-center">
                                            Rating
                                            {sortConfig.key === 'rating' && (
                                                <span className="ml-1">
                                                    {sortConfig.direction === 'asc' ? (
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                            <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                                                        </svg>
                                                    ) : (
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                                        </svg>
                                                    )}
                                                </span>
                                            )}
                                        </div>
                                    </th>
                                    {showTopics && (
                                        <th
                                            scope="col"
                                            className="sticky top-0 px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-200 uppercase tracking-wider"
                                        >
                                            Topics
                                        </th>
                                    )}
                                    <th
                                        scope="col"
                                        className="sticky top-0 px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-200 uppercase tracking-wider"
                                    >
                                        Companies
                                    </th>
                                    <th
                                        scope="col"
                                        className="sticky top-0 px-4 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-200 uppercase tracking-wider"
                                    >
                                        Status
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {currentProblems.length > 0 ? (
                                    currentProblems.map((problem) => (
                                        <tr
                                            key={problem.id}
                                            className={`transition-colors ${completedProblems.includes(problem.id)
                                                ? 'bg-green-200 dark:bg-green-900 hover:bg-green-300 dark:hover:bg-green-800'
                                                : 'hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                                        >
                                            <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                                                {problem.id}
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                                                <a
                                                    href={problem.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                                                >
                                                    {problem.title}
                                                </a>
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getDifficultyColor(problem.difficulty)}`}>
                                                    {problem.difficulty}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                                                {problem.rating || 'N/A'}
                                            </td>
                                            {showTopics && (
                                                <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                                                    <div className="flex flex-wrap gap-1">
                                                        {problem.topics.slice(0, 3).map((topic, index) => (
                                                            <span
                                                                key={index}
                                                                className="px-2 py-1 text-xs font-medium text-indigo-600 bg-indigo-100 rounded-full dark:text-indigo-400 dark:bg-indigo-900/50 hover:bg-indigo-200 dark:hover:bg-indigo-900 transition-colors cursor-pointer"
                                                                onClick={() => setTopicFilter(topic)}
                                                            >
                                                                {topic}
                                                            </span>
                                                        ))}
                                                        {problem.topics.length > 3 && (
                                                            <span className="px-2 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded-full dark:text-gray-400 dark:bg-gray-700">
                                                                +{problem.topics.length - 3}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                            )}
                                            <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                                                <div className="flex flex-wrap gap-1">
                                                    {problem.companies.slice(0, 3).map((company, index) => (
                                                        <span
                                                            key={index}
                                                            className="px-2 py-1 text-xs font-medium text-purple-600 bg-purple-100 rounded-full dark:text-purple-400 dark:bg-purple-900/50 hover:bg-purple-200 dark:hover:bg-purple-900 transition-colors cursor-pointer"
                                                            onClick={() => setCompanyFilter(company)}
                                                        >
                                                            {company}
                                                        </span>
                                                    ))}
                                                    {problem.companies.length > 3 && (
                                                        <span className="px-2 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded-full dark:text-gray-400 dark:bg-gray-700">
                                                            +{problem.companies.length - 3}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                                                <button
                                                    onClick={() => toggleCompleted(problem.id)}
                                                    className={`px-4 py-2 text-xs rounded-lg font-medium transition-colors ${completedProblems.includes(problem.id)
                                                        ? 'bg-green-500 text-white dark:bg-green-600 hover:bg-green-600 dark:hover:bg-green-700'
                                                        : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
                                                >
                                                    {completedProblems.includes(problem.id) ? 'Completed' : 'Mark Done'}
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="7" className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                                            No problems found matching your filters. Try adjusting your search criteria.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="px-4 py-3 flex items-center justify-between border-t border-gray-200 dark:border-gray-700">
                            <div className="flex-1 flex justify-between sm:hidden">
                                <button
                                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                    disabled={currentPage === 1}
                                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Previous
                                </button>
                                <button
                                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                    disabled={currentPage === totalPages}
                                    className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Next
                                </button>
                            </div>
                            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                                <div>
                                    <p className="text-sm text-gray-700 dark:text-gray-300">
                                        Showing <span className="font-medium">{indexOfFirstProblem + 1}</span> to{' '}
                                        <span className="font-medium">
                                            {Math.min(indexOfLastProblem, filteredProblems.length)}
                                        </span>{' '}
                                        of <span className="font-medium">{filteredProblems.length}</span> results
                                    </p>
                                </div>
                                <div>
                                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                                        <button
                                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                            disabled={currentPage === 1}
                                            className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <span className="sr-only">Previous</span>
                                            <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                                <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                                            </svg>
                                        </button>
                                        {getPageNumbers().map((pageNum, index) => (
                                            <button
                                                key={index}
                                                onClick={() => typeof pageNum === 'number' && setCurrentPage(pageNum)}
                                                disabled={pageNum === '...'}
                                                className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${pageNum === currentPage
                                                    ? 'z-10 bg-indigo-50 dark:bg-indigo-900 border-indigo-500 dark:border-indigo-600 text-indigo-600 dark:text-indigo-300'
                                                    : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                                                    } ${pageNum === '...' ? 'cursor-default' : 'cursor-pointer'}`}
                                            >
                                                {pageNum}
                                            </button>
                                        ))}
                                        <button
                                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                            disabled={currentPage === totalPages}
                                            className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <span className="sr-only">Next</span>
                                            <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                                            </svg>
                                        </button>
                                    </nav>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Feedback Box */}
                <div className="mt-6 bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6">
                    <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">Feedback</h2>
                    <textarea
                        className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
                        rows="4"
                        placeholder="Share your feedback..."
                        value={feedback}
                        onChange={(e) => setFeedback(e.target.value)}
                    />
                    <button
                        className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400"
                        onClick={handleFeedbackSubmit}
                    >
                        Submit Feedback
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Problems;