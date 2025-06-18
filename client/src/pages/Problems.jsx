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
    const [stats, setStats] = useState({ total: 0, completed: 0 });
    const [showTopics, setShowTopics] = useState(false);
    const [feedback, setFeedback] = useState('');
    const [expandedCompanies, setExpandedCompanies] = useState({});
    const [currentPage, setCurrentPage] = useState(1);
    const problemsPerPage = 20;
    const [difficultyStats, setDifficultyStats] = useState({ easy: { total: 0, completed: 0 }, medium: { total: 0, completed: 0 }, hard: { total: 0, completed: 0 } });

    // Save completed problems to localStorage
    useEffect(() => {
        localStorage.setItem('completedProblems', JSON.stringify(completedProblems));
        setStats({
            total: problems.length,
            completed: completedProblems.length
        });
        // Calculate difficulty stats
        const diffStats = { easy: { total: 0, completed: 0 }, medium: { total: 0, completed: 0 }, hard: { total: 0, completed: 0 } };
        for (const p of problems) {
            const diff = String(p.difficulty).toLowerCase();
            if (diffStats[diff] !== undefined) {
                diffStats[diff].total++;
                if (completedProblems.map(String).includes(String(p.id))) diffStats[diff].completed++;
            }
        }
        setDifficultyStats(diffStats);
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
                    p.id.toLowerCase().includes(s) ||
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
        const sortedProblems = [...filtered].sort((a, b) => {
            if (sortConfig.key === 'id') {
                return sortConfig.direction === 'asc' ? a.id - b.id : b.id - a.id;
            }
            if (sortConfig.key === 'rating') {
                return sortConfig.direction === 'asc' ? (a.rating || 0) - (b.rating || 0) : (b.rating || 0) - (a.rating || 0);
            }
            if (sortConfig.key === 'difficulty') {
                const order = { easy: 1, medium: 2, hard: 3 };
                return sortConfig.direction === 'asc'
                    ? (order[a.difficulty] || 0) - (order[b.difficulty] || 0)
                    : (order[b.difficulty] || 0) - (order[a.difficulty] || 0);
            }
            return 0;
        });

        setFilteredProblems(sortedProblems);
        setCurrentPage(1);
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
            const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3002/api'}/feedback/submit`, {
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

    const toggleCompanies = (problemId) => {
        setExpandedCompanies((prev) => ({
            ...prev,
            [problemId]: !prev[problemId],
        }));
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <div className="max-w-md p-6 bg-white rounded-lg shadow-lg">
                    <h2 className="text-xl font-bold text-red-500 mb-4">Error Loading Problems</h2>
                    <p className="text-gray-700 mb-4">{error}</p>
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
        <div className="min-h-screen w-full bg-gray-50 dark:bg-[#181A1B] flex flex-col px-2 sm:px-4 md:px-8">
            <div className="w-full max-w-7xl mx-auto">
                {/* Navbar: responsive text and spacing */}
                <nav className="bg-white dark:bg-[#23272A] shadow-lg sticky top-0 z-50 flex items-center justify-between px-2 sm:px-4 py-2 md:py-3 rounded-lg mb-4 md:mb-6 gap-2 md:gap-0">
                    <div className="flex items-center gap-2 md:gap-4">
                        <span className="text-lg md:text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                            </svg>
                            GrindLC
                        </span>
                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full">
                            {stats.completed} / {stats.total} solved
                        </span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm">
                        <span className="px-2 py-1 bg-green-200 text-green-800 rounded-full">
                            Easy: {difficultyStats.easy.completed}/{difficultyStats.easy.total}
                        </span>
                        <span className="px-2 py-1 bg-yellow-200 text-yellow-800 rounded-full">
                            Medium: {difficultyStats.medium.completed}/{difficultyStats.medium.total}
                        </span>
                        <span className="px-2 py-1 bg-red-200 text-red-800 rounded-full">
                            Hard: {difficultyStats.hard.completed}/{difficultyStats.hard.total}
                        </span>
                    </div>
                </nav>

                {/* Filters Section: responsive grid */}
                <div className="bg-white dark:bg-[#23272A] shadow-lg rounded-lg p-2 sm:p-4 mb-4 md:mb-6">
                    <div className="flex flex-col md:flex-row flex-wrap gap-2 md:gap-4 items-center w-full">
                        <div className="flex-1 min-w-[140px]">
                            <input
                                type="text"
                                placeholder="Search problems..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-[#181A1B] dark:text-gray-100 text-sm md:text-base"
                            />
                        </div>
                        <div className="flex-1 min-w-[140px]">
                            <select
                                value={companyFilter}
                                onChange={(e) => setCompanyFilter(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-[#181A1B] dark:text-gray-100 text-sm md:text-base"
                            >
                                <option value="">All Companies</option>
                                {allCompanies.map((company) => (
                                    <option key={company} value={company}>{company}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex-1 min-w-[140px]">
                            <select
                                value={difficultyFilter}
                                onChange={(e) => setDifficultyFilter(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-[#181A1B] dark:text-gray-100 text-sm md:text-base"
                            >
                                <option value="">All Difficulties</option>
                                {allDifficulties.map((diff) => (
                                    <option key={diff} value={diff}>{diff.charAt(0).toUpperCase() + diff.slice(1)}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex-1 min-w-[140px]">
                            <select
                                value={topicFilter}
                                onChange={(e) => setTopicFilter(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-[#181A1B] dark:text-gray-100 text-sm md:text-base"
                            >
                                <option value="">All Topics</option>
                                {allTopics.map((topic) => (
                                    <option key={topic} value={topic}>{topic}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex-1 min-w-[140px] flex gap-2 items-center w-full md:w-auto">
                            <input
                                type="number"
                                placeholder="Min"
                                value={ratingRange.min}
                                onChange={(e) => setRatingRange((prev) => ({ ...prev, min: e.target.value }))}
                                className="w-20 min-w-[70px] px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-[#181A1B] dark:text-gray-100 text-xs"
                            />
                            <span className="text-gray-500 dark:text-gray-300">to</span>
                            <input
                                type="number"
                                placeholder="Max"
                                value={ratingRange.max}
                                onChange={(e) => setRatingRange((prev) => ({ ...prev, max: e.target.value }))}
                                className="w-20 min-w-[70px] px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-[#181A1B] dark:text-gray-100 text-xs"
                            />
                        </div>
                        <div className="flex gap-2 mt-2 sm:mt-0">
                            <button
                                onClick={() => setShowTopics(!showTopics)}
                                className="px-3 py-1 text-xs md:text-sm bg-gray-100 dark:bg-[#181A1B] rounded-lg hover:bg-gray-200 dark:hover:bg-[#23272A] transition-colors dark:text-white"
                            >
                                {showTopics ? 'Hide Topics' : 'Show Topics'}
                            </button>
                            <button
                                onClick={resetFilters}
                                className="px-3 py-1 text-xs md:text-sm bg-gray-100 dark:bg-[#181A1B] rounded-lg hover:bg-gray-200 dark:hover:bg-[#23272A] transition-colors dark:text-white"
                            >
                                Reset All
                            </button>
                        </div>
                    </div>
                </div>

                {/* Table: responsive text, scroll on small screens */}
                <div className="bg-white dark:bg-[#23272A] shadow-lg rounded-lg overflow-x-auto">
                    <table className="w-full text-xs sm:text-sm md:text-base">
                        <thead>
                            <tr className="bg-gray-50 dark:bg-[#23272A]">
                                <th
                                    className="px-2 sm:px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer select-none"
                                    onClick={() => setSortConfig(prev => ({ key: 'id', direction: prev.key === 'id' && prev.direction === 'asc' ? 'desc' : 'asc' }))}
                                >
                                    <div className="flex items-center gap-1">
                                        ID
                                        {sortConfig.key === 'id' && (
                                            <span>{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>
                                        )}
                                    </div>
                                </th>
                                <th className="px-2 sm:px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Title</th>
                                {showTopics && (
                                    <th className="px-2 sm:px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Topics</th>
                                )}
                                <th className="px-2 sm:px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Companies</th>
                                <th
                                    className="px-2 sm:px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer select-none"
                                    onClick={() => setSortConfig(prev => ({ key: 'difficulty', direction: prev.key === 'difficulty' && prev.direction === 'asc' ? 'desc' : 'asc' }))}
                                >
                                    <div className="flex items-center gap-1">
                                        Difficulty
                                        {sortConfig.key === 'difficulty' && (
                                            <span>{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>
                                        )}
                                    </div>
                                </th>
                                <th
                                    className="px-2 sm:px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer select-none"
                                    onClick={() => setSortConfig(prev => ({ key: 'rating', direction: prev.key === 'rating' && prev.direction === 'asc' ? 'desc' : 'asc' }))}
                                >
                                    <div className="flex items-center gap-1">
                                        Rating
                                        {sortConfig.key === 'rating' && (
                                            <span>{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>
                                        )}
                                    </div>
                                </th>
                                <th className="px-2 sm:px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {currentProblems.map((problem, idx) => (
                                <tr
                                    key={problem.id}
                                    className={`transition-colors${completedProblems.includes(problem.id)
                                        ? ' bg-green-300 dark:bg-green-950'
                                        : ' hover:bg-gray-50 dark:hover:bg-[#181A1B]'}${idx !== currentProblems.length - 1 ? ' border-b border-gray-300 dark:border-gray-700' : ''}`}
                                >
                                    <td className="px-2 sm:px-4 py-2 whitespace-nowrap text-sm text-gray-900">{problem.id}</td>
                                    <td className="px-2 sm:px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                                        <a href={problem.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">{problem.title}</a>
                                    </td>
                                    {showTopics && (
                                        <td className="px-2 sm:px-4 py-2 text-sm text-gray-900">
                                            <div className="flex flex-wrap gap-1">
                                                {problem.topics.slice(0, 3).map((topic, index) => (
                                                    <span key={index} className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-full">{topic}</span>
                                                ))}
                                            </div>
                                        </td>
                                    )}
                                    <td className="px-2 sm:px-4 py-2 text-sm text-gray-900">
                                        <div className="flex flex-wrap gap-1 items-center">
                                            {(expandedCompanies[problem.id] ? problem.companies : problem.companies.slice(0, 3)).map((company, index) => (
                                                <span key={index} className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-full">{company}</span>
                                            ))}
                                            {problem.companies.length > 3 && !expandedCompanies[problem.id] && (
                                                <span
                                                    className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-full cursor-pointer select-none"
                                                    onClick={() => toggleCompanies(problem.id)}
                                                >
                                                    +{problem.companies.length - 3}
                                                </span>
                                            )}
                                            {problem.companies.length > 3 && expandedCompanies[problem.id] && (
                                                <span
                                                    className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-full cursor-pointer select-none"
                                                    onClick={() => toggleCompanies(problem.id)}
                                                >
                                                    …
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-2 sm:px-4 py-2 text-sm text-gray-900 text-center">
                                        <span className={`px-2 py-1 text-xs rounded-full font-semibold ${problem.difficulty === 'easy' ? 'bg-green-200 text-green-800 dark:bg-green-900 dark:text-green-200' : problem.difficulty === 'medium' ? 'bg-yellow-200 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' : 'bg-red-200 text-red-800 dark:bg-red-900 dark:text-red-200'}`}>{problem.difficulty}</span>
                                    </td>
                                    <td className="px-2 sm:px-4 py-2 text-sm text-gray-900 text-center">{problem.rating || 'N/A'}</td>
                                    <td className="px-2 sm:px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900 text-center">
                                        <button
                                            onClick={() => toggleCompleted(problem.id)}
                                            className={`px-4 py-2 text-xs rounded-lg font-medium transition-colors ${completedProblems.includes(problem.id)
                                                ? 'bg-green-500 text-white hover:bg-green-600'
                                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                                        >
                                            {completedProblems.includes(problem.id) ? 'Completed' : 'Mark Done'}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls: responsive padding and text */}
                {totalPages > 1 && (
                    <div className="flex justify-center items-center gap-2 mt-4">
                        <button
                            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                            disabled={currentPage === 1}
                            className="px-2 py-1 rounded bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 disabled:opacity-50"
                        >
                            Prev
                        </button>
                        {getPageNumbers().map((pageNum, idx) => (
                            <button
                                key={idx}
                                onClick={() => typeof pageNum === 'number' && setCurrentPage(pageNum)}
                                disabled={pageNum === '...'}
                                className={`px-2 py-1 rounded ${pageNum === currentPage ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200'} ${pageNum === '...' ? 'cursor-default' : 'cursor-pointer'}`}
                            >
                                {pageNum}
                            </button>
                        ))}
                        <button
                            onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                            disabled={currentPage === totalPages}
                            className="px-2 py-1 rounded bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 disabled:opacity-50"
                        >
                            Next
                        </button>
                    </div>
                )}

                {/* Feedback Box: responsive padding and text */}
                <div className="mt-6 md:mt-8 bg-white dark:bg-[#23272A] shadow-lg rounded-lg p-3 sm:p-6">
                    <h3 className="text-base md:text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2 md:mb-4">Feedback</h3>
                    <textarea
                        value={feedback}
                        onChange={(e) => setFeedback(e.target.value)}
                        placeholder="Share your thoughts about the problems or suggest improvements..."
                        className="w-full h-24 md:h-32 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-[#181A1B] dark:text-gray-100 text-xs md:text-base resize-none"
                    />
                    <button
                        onClick={handleFeedbackSubmit}
                        className="mt-3 md:mt-4 px-3 md:px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-xs md:text-base"
                    >
                        Submit Feedback
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Problems;