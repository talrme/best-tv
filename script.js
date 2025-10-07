// Best TV Shows JavaScript

// Google Sheets URL - using gid=0 for the first sheet
const SHEET_ID = '1B5iPZgD3AVaQQM9dFa-2V-lj5RGEPTClJi-gvlrmIJY';
const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&gid=0`;

let allData = [];
let showsData = {};
let currentShow = null;
let mustWatchThreshold = 8.0;
let considerThreshold = 7.0;
let disableAnimation = false;

document.addEventListener('DOMContentLoaded', async () => {
    console.log('Best TV Shows website loaded');
    console.log('Fetching from:', SHEET_URL);
    
    await loadData();
    setupEventListeners();
    
    // Check for URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    
    // Load thresholds from URL if present
    const considerParam = urlParams.get('consider');
    const mustWatchParam = urlParams.get('mustWatch');
    
    if (considerParam) {
        const value = parseFloat(considerParam);
        if (!isNaN(value) && value >= 5.0 && value <= 9.5) {
            considerThreshold = value;
            document.getElementById('consider-slider').value = value;
        }
    }
    
    if (mustWatchParam) {
        const value = parseFloat(mustWatchParam);
        if (!isNaN(value) && value >= 5.0 && value <= 9.5) {
            mustWatchThreshold = value;
            document.getElementById('must-watch-slider').value = value;
        }
    }
    
    // Ensure thresholds are valid (must-watch > consider)
    if (mustWatchThreshold <= considerThreshold) {
        mustWatchThreshold = considerThreshold + 0.1;
        document.getElementById('must-watch-slider').value = mustWatchThreshold;
    }
    
    // Check for show parameter in URL
    const showParam = urlParams.get('show');
    if (showParam) {
        // Decode and find matching show
        const decodedShow = decodeURIComponent(showParam);
        const searchInput = document.getElementById('show-search');
        
        // Try to find exact match or case-insensitive match
        const matchingShow = Object.keys(showsData).find(
            show => show.toLowerCase() === decodedShow.toLowerCase()
        );
        
        if (matchingShow) {
            searchInput.value = matchingShow;
            displayShow(matchingShow);
        }
    }
});

async function loadData() {
    const loadingEl = document.getElementById('loading');
    const errorEl = document.getElementById('error');
    
    try {
        loadingEl.style.display = 'block';
        errorEl.style.display = 'none';
        
        console.log('Attempting to fetch data...');
        const response = await fetch(SHEET_URL);
        console.log('Response status:', response.status);
        console.log('Response headers:', response.headers);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const csvText = await response.text();
        console.log('CSV text length:', csvText.length);
        console.log('First 500 chars:', csvText.substring(0, 500));
        
        allData = parseCSV(csvText);
        console.log('Loaded episodes:', allData.length);
        console.log('First 3 episodes:', allData.slice(0, 3));
        
        // Group by show
        showsData = groupByShow(allData);
        const showNames = Object.keys(showsData).sort();
        console.log('Shows found:', showNames.length);
        console.log('Show names (alphabetical):', showNames);
        
        populateShowDropdown();
        
        loadingEl.style.display = 'none';
        
    } catch (error) {
        console.error('Error loading data:', error);
        console.error('Error details:', error.message);
        loadingEl.style.display = 'none';
        errorEl.innerHTML = `Failed to load TV show data. Please check the console for details.<br><br>Error: ${error.message}`;
        errorEl.style.display = 'block';
    }
}

function parseCSVLine(line) {
    const fields = [];
    let current = '';
    let inQuotes = false;
    
    for (let j = 0; j < line.length; j++) {
        const char = line[j];
        
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            fields.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    fields.push(current.trim());
    
    return fields.map(f => f.replace(/^"|"$/g, '').trim());
}

function parseCSV(csv) {
    const lines = csv.split('\n').filter(line => line.trim());
    const data = [];
    
    if (lines.length < 2) {
        console.error('CSV has insufficient lines');
        return data;
    }
    
    // Parse header row to find column indices
    const headers = parseCSVLine(lines[0]);
    console.log('CSV Headers:', headers);
    
    const columnMap = {};
    headers.forEach((header, index) => {
        columnMap[header.toLowerCase()] = index;
    });
    
    console.log('Column mapping:', columnMap);
    
    // Find the column indices
    const seasonIdx = columnMap['season'];
    const episodeIdx = columnMap['episode'];
    const titleIdx = columnMap['title'];
    const ratingIdx = columnMap['rating'];
    const votesIdx = columnMap['votes'];
    const imdbIdx = columnMap['imdb link'] || columnMap['imdblink'] || columnMap['link'];
    const showIdx = columnMap['show'];
    
    console.log('Column indices:', { seasonIdx, episodeIdx, titleIdx, ratingIdx, votesIdx, imdbIdx, showIdx });
    
    // Parse data rows
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        const fields = parseCSVLine(line);
        
        if (fields.length < headers.length) {
            console.log('Skipping line with insufficient fields:', fields);
            continue;
        }
        
        const episode = {
            season: parseInt(fields[seasonIdx]) || 0,
            episode: parseInt(fields[episodeIdx]) || 0,
            title: fields[titleIdx] || '',
            rating: parseFloat(fields[ratingIdx]) || 0,
            votes: parseInt(fields[votesIdx]?.replace(/,/g, '')) || 0,
            imdbLink: fields[imdbIdx] || '',
            show: fields[showIdx] || ''
        };
        
        // Validate that we have valid data
        if (episode.show && episode.title && episode.season >= 0) {
            data.push(episode);
        }
    }
    
    return data;
}

function groupByShow(data) {
    const grouped = {};
    
    data.forEach(episode => {
        if (!grouped[episode.show]) {
            grouped[episode.show] = [];
        }
        grouped[episode.show].push(episode);
    });
    
    return grouped;
}

function populateShowDropdown() {
    // Store all shows for filtering
    window.allShows = Object.keys(showsData).sort();
}

function setupEventListeners() {
    const searchInput = document.getElementById('show-search');
    const dropdown = document.getElementById('show-dropdown');
    const dropdownArrow = document.getElementById('dropdown-arrow');
    const clearButton = document.getElementById('clear-button');
    const mustWatchSlider = document.getElementById('must-watch-slider');
    const considerSlider = document.getElementById('consider-slider');
    const sliderRange = document.getElementById('slider-range');
    const thumbLabel1 = document.getElementById('thumb-label-1');
    const thumbLabel2 = document.getElementById('thumb-label-2');
    const sliderTooltip = document.getElementById('slider-tooltip');
    const tooltipSkip = document.getElementById('tooltip-skip');
    const tooltipConsider = document.getElementById('tooltip-consider');
    const tooltipMustWatch = document.getElementById('tooltip-must-watch');
    let arrowClicked = false;
    
    // Function to update slider visualization
    function updateSliderVisuals() {
        const min = 5.0;
        const max = 9.5;
        const range = max - min;
        
        const considerPercent = ((considerThreshold - min) / range) * 100;
        const mustWatchPercent = ((mustWatchThreshold - min) / range) * 100;
        
        // Update the colored range between the two thumbs
        sliderRange.style.left = considerPercent + '%';
        sliderRange.style.width = (mustWatchPercent - considerPercent) + '%';
        sliderRange.style.background = 'linear-gradient(to right, #ffc107, #4caf50)';
        
        // Update the track colors
        const track = sliderRange.parentElement;
        track.style.background = `linear-gradient(to right, 
            #f44336 0%, 
            #f44336 ${considerPercent}%, 
            #ffc107 ${considerPercent}%, 
            #ffc107 ${mustWatchPercent}%, 
            #4caf50 ${mustWatchPercent}%, 
            #4caf50 100%)`;
        
        // Update thumb labels position and text
        const sliderWidth = considerSlider.offsetWidth;
        thumbLabel1.style.left = (considerPercent / 100 * sliderWidth) + 'px';
        thumbLabel1.textContent = considerThreshold.toFixed(1);
        
        thumbLabel2.style.left = (mustWatchPercent / 100 * sliderWidth) + 'px';
        thumbLabel2.textContent = mustWatchThreshold.toFixed(1);
        
        // Update tooltip text
        tooltipSkip.textContent = `< ${considerThreshold.toFixed(1)}`;
        tooltipConsider.textContent = `${considerThreshold.toFixed(1)} - ${mustWatchThreshold.toFixed(1)}`;
        tooltipMustWatch.textContent = `≥ ${mustWatchThreshold.toFixed(1)}`;
    }
    
    // Initial update after a brief delay to ensure sliders are rendered
    setTimeout(() => {
        updateSliderVisuals();
    }, 10);
    
    // Also update on window resize
    window.addEventListener('resize', updateSliderVisuals);
    
    // Show/hide tooltip on slider hover
    const sliderContainer = document.querySelector('.dual-slider-container');
    sliderContainer.addEventListener('mouseenter', () => {
        sliderTooltip.style.display = 'block';
    });
    sliderContainer.addEventListener('mouseleave', () => {
        sliderTooltip.style.display = 'none';
    });
    
    // Show filtered dropdown on focus (unless arrow was clicked)
    searchInput.addEventListener('focus', () => {
        if (!arrowClicked) {
            showDropdown(searchInput.value);
        }
        arrowClicked = false; // Reset flag
    });
    
    // Filter as user types
    searchInput.addEventListener('input', (e) => {
        showDropdown(e.target.value);
    });
    
    // Arrow button always shows ALL shows
    dropdownArrow.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        arrowClicked = true; // Set flag before focusing
        
        console.log('Arrow clicked, dropdown display:', dropdown.style.display);
        console.log('All shows available:', window.allShows ? window.allShows.length : 'undefined');
        
        if (dropdown.style.display === 'block') {
            dropdown.style.display = 'none';
        } else {
            // Show all shows by passing empty string
            showDropdown('');
        }
        searchInput.focus();
    });
    
    clearButton.addEventListener('click', (e) => {
        e.stopPropagation();
        searchInput.value = '';
        clearButton.style.display = 'none';
        document.getElementById('heatmap').innerHTML = '';
        document.getElementById('must-watch-table-container').style.display = 'none';
        document.getElementById('episode-counts').style.display = 'none';
        updateURL('', considerThreshold, mustWatchThreshold);
        showDropdown('');
        searchInput.focus();
    });
    
    // Hide dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target) && 
            !dropdown.contains(e.target) && 
            !dropdownArrow.contains(e.target)) {
            dropdown.style.display = 'none';
        }
    });
    
    // Handle keyboard navigation
    searchInput.addEventListener('keydown', (e) => {
        const items = dropdown.querySelectorAll('.show-dropdown-item');
        const currentIndex = Array.from(items).findIndex(item => item.classList.contains('selected'));
        
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            const nextIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
            selectDropdownItem(items, nextIndex);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            const prevIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
            selectDropdownItem(items, prevIndex);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (currentIndex >= 0) {
                items[currentIndex].click();
            }
        } else if (e.key === 'Escape') {
            dropdown.style.display = 'none';
            searchInput.blur();
        }
    });
    
    // Threshold slider listeners
    mustWatchSlider.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        
        // Ensure must-watch is always higher than consider (minimum 0.1 gap)
        if (value <= considerThreshold) {
            mustWatchThreshold = considerThreshold + 0.1;
            mustWatchSlider.value = mustWatchThreshold;
        } else {
            mustWatchThreshold = value;
        }
        
        updateSliderVisuals();
        
        // Refresh heatmap if a show is selected (without animation)
        if (currentShow) {
            disableAnimation = true;
            displayShow(currentShow);
        }
        
        // Update URL with new threshold
        if (currentShow) {
            updateURL(currentShow);
        }
    });
    
    considerSlider.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        
        // Ensure consider is always lower than must-watch (minimum 0.1 gap)
        if (value >= mustWatchThreshold) {
            considerThreshold = mustWatchThreshold - 0.1;
            considerSlider.value = considerThreshold;
        } else {
            considerThreshold = value;
        }
        
        updateSliderVisuals();
        
        // Refresh heatmap if a show is selected (without animation)
        if (currentShow) {
            disableAnimation = true;
            displayShow(currentShow);
        }
        
        // Update URL with new threshold
        if (currentShow) {
            updateURL(currentShow);
        }
    });
    
    // Re-enable animation when slider is released
    mustWatchSlider.addEventListener('change', () => {
        disableAnimation = false;
    });
    
    considerSlider.addEventListener('change', () => {
        disableAnimation = false;
    });
}

function showDropdown(searchTerm) {
    const dropdown = document.getElementById('show-dropdown');
    const term = searchTerm.toLowerCase();
    
    const filteredShows = window.allShows.filter(show => 
        show.toLowerCase().includes(term)
    );
    
    dropdown.innerHTML = '';
    
    if (filteredShows.length === 0) {
        dropdown.innerHTML = '<div class="show-dropdown-item" style="color: #999; cursor: default;">No shows found</div>';
    } else {
        filteredShows.forEach((show, index) => {
            const item = document.createElement('div');
            item.className = 'show-dropdown-item';
            item.textContent = show;
            if (index === 0) item.classList.add('selected');
            
            item.addEventListener('click', () => {
                selectShow(show);
            });
            
            dropdown.appendChild(item);
        });
    }
    
    dropdown.style.display = 'block';
}

function selectDropdownItem(items, index) {
    items.forEach(item => item.classList.remove('selected'));
    if (items[index]) {
        items[index].classList.add('selected');
        items[index].scrollIntoView({ block: 'nearest' });
    }
}

function selectShow(showName) {
    const searchInput = document.getElementById('show-search');
    const dropdown = document.getElementById('show-dropdown');
    const clearButton = document.getElementById('clear-button');
    
    searchInput.value = showName;
    dropdown.style.display = 'none';
    clearButton.style.display = 'block';
    disableAnimation = false; // Enable animation for new show selection
    displayShow(showName);
    updateURL(showName);
}

function updateURL(showName) {
    const url = new URL(window.location);
    url.searchParams.set('show', encodeURIComponent(showName));
    url.searchParams.set('consider', considerThreshold.toFixed(1));
    url.searchParams.set('mustWatch', mustWatchThreshold.toFixed(1));
    window.history.pushState({}, '', url);
}

function displayShow(showName) {
    const episodes = showsData[showName];
    if (!episodes) return;
    
    currentShow = showName;
    
    // Update episode counts
    updateEpisodeCounts(episodes);
    
    // Show info section
    const showInfoEl = document.getElementById('show-info');
    const showTitleEl = document.getElementById('show-title');
    const totalEpisodesEl = document.getElementById('total-episodes');
    const avgRatingEl = document.getElementById('avg-rating');
    const totalSeasonsEl = document.getElementById('total-seasons');
    
    showTitleEl.textContent = showName;
    totalEpisodesEl.textContent = episodes.length;
    
    const avgRating = episodes.reduce((sum, ep) => sum + ep.rating, 0) / episodes.length;
    avgRatingEl.textContent = avgRating.toFixed(2);
    
    const seasons = new Set(episodes.map(ep => ep.season));
    totalSeasonsEl.textContent = seasons.size;
    
    // Create heatmap
    createHeatmap(episodes);
    
    document.getElementById('heatmap-container').style.display = 'block';
    
    // Create must-watch table
    createMustWatchTable(episodes);
}

function createHeatmap(episodes) {
    const heatmapEl = document.getElementById('heatmap');
    heatmapEl.innerHTML = '';
    
    // Filter out episode 0 and episodes without ratings
    const validEpisodes = episodes.filter(ep => ep.episode > 0 && ep.rating > 0);
    
    // Organize episodes by season and episode number
    const grid = {};
    let maxEpisode = 0;
    const seasons = new Set();
    
    validEpisodes.forEach(ep => {
        if (!grid[ep.season]) {
            grid[ep.season] = {};
        }
        grid[ep.season][ep.episode] = ep;
        maxEpisode = Math.max(maxEpisode, ep.episode);
        seasons.add(ep.season);
    });
    
    // Only include seasons that have at least one valid episode
    const sortedSeasons = Array.from(seasons)
        .filter(season => Object.keys(grid[season]).length > 0)
        .sort((a, b) => a - b);
    
    // Create season headers
    const headerRow = document.createElement('div');
    headerRow.className = 'season-header';
    
    sortedSeasons.forEach((season, index) => {
        const label = document.createElement('div');
        label.className = 'season-label';
        label.textContent = `S${season}`;
        
        // Add animation delay (unless disabled)
        if (disableAnimation) {
            label.style.animation = 'none';
            label.style.opacity = '1';
        } else {
            label.style.animationDelay = `${index * 0.05}s`;
        }
        
        headerRow.appendChild(label);
    });
    
    heatmapEl.appendChild(headerRow);
    
    // Calculate total number of cells for animation timing
    const totalCells = validEpisodes.length;
    const maxAnimationTime = 1.5; // Maximum 1.5 seconds for all animations
    const delayPerCell = Math.min(0.02, maxAnimationTime / totalCells);
    
    // Create grid - only for episodes that exist (starting from episode 1)
    const gridContainer = document.createElement('div');
    gridContainer.className = 'heatmap-grid';
    
    let cellCounter = 0;
    
    for (let episodeNum = 1; episodeNum <= maxEpisode; episodeNum++) {
        // Check if this episode number exists in any season
        const hasEpisode = sortedSeasons.some(season => grid[season]?.[episodeNum]);
        
        if (!hasEpisode) continue; // Skip rows where no season has this episode
        
        const row = document.createElement('div');
        row.className = 'heatmap-row';
        
        // Row label
        const rowLabel = document.createElement('div');
        rowLabel.className = 'row-label';
        rowLabel.textContent = `E${episodeNum}`;
        row.appendChild(rowLabel);
        
        // Episode cells
        sortedSeasons.forEach(season => {
            const episode = grid[season]?.[episodeNum];
            
            if (episode) {
                const cell = document.createElement('div');
                cell.className = 'episode-cell';
                
                const rating = episode.rating;
                
                if (rating >= mustWatchThreshold) {
                    cell.classList.add('excellent');
                } else if (rating >= considerThreshold) {
                    cell.classList.add('good');
                } else {
                    cell.classList.add('average');
                }
                
                cell.textContent = rating.toFixed(1);
                cell.dataset.title = episode.title;
                cell.dataset.rating = episode.rating;
                cell.dataset.votes = episode.votes;
                cell.dataset.season = episode.season;
                cell.dataset.episode = episode.episode;
                cell.dataset.imdb = episode.imdbLink;
                
                // Add staggered animation delay with max time cap (unless disabled)
                if (disableAnimation) {
                    cell.style.animation = 'none';
                    cell.style.opacity = '1';
                } else {
                    cell.style.animationDelay = `${cellCounter * delayPerCell}s`;
                }
                cellCounter++;
                
                // Add click handler to open IMDB
                cell.addEventListener('click', () => {
                    window.open(episode.imdbLink, '_blank');
                });
                
                // Add hover tooltip
                cell.addEventListener('mouseenter', showTooltip);
                cell.addEventListener('mouseleave', hideTooltip);
                cell.addEventListener('mousemove', moveTooltip);
                
                row.appendChild(cell);
            }
            // If no episode exists for this season/episode combo, don't add a cell at all
        });
        
        gridContainer.appendChild(row);
    }
    
    heatmapEl.appendChild(gridContainer);
}

let tooltip = null;

function showTooltip(e) {
    const cell = e.currentTarget;
    if (cell.classList.contains('empty')) return;
    
    if (!tooltip) {
        tooltip = document.createElement('div');
        tooltip.className = 'tooltip';
        document.body.appendChild(tooltip);
    }
    
    const title = cell.dataset.title;
    const rating = cell.dataset.rating;
    const votes = cell.dataset.votes;
    const season = cell.dataset.season;
    const episode = cell.dataset.episode;
    
    tooltip.innerHTML = `
        <div class="tooltip-title">${title}</div>
        <div class="tooltip-info">
            <div>Season ${season}, Episode ${episode}</div>
            <div>Rating: ${rating} ⭐</div>
            <div>Votes: ${parseInt(votes).toLocaleString()}</div>
            <div style="margin-top: 6px; opacity: 0.8;">Click to view on IMDB</div>
        </div>
    `;
    
    tooltip.style.display = 'block';
    moveTooltip(e);
}

function hideTooltip() {
    if (tooltip) {
        tooltip.style.display = 'none';
    }
}

function moveTooltip(e) {
    if (!tooltip) return;
    
    const x = e.clientX + 15;
    const y = e.clientY + 15;
    
    tooltip.style.left = x + 'px';
    tooltip.style.top = y + 'px';
}

function updateEpisodeCounts(episodes) {
    // Filter out episode 0 and episodes without ratings
    const validEpisodes = episodes.filter(ep => ep.episode > 0 && ep.rating > 0);
    
    // Count episodes in each category
    let skipCount = 0;
    let considerCount = 0;
    let mustWatchCount = 0;
    
    validEpisodes.forEach(ep => {
        if (ep.rating >= mustWatchThreshold) {
            mustWatchCount++;
        } else if (ep.rating >= considerThreshold) {
            considerCount++;
        } else {
            skipCount++;
        }
    });
    
    // Update the display
    document.getElementById('skip-count').textContent = skipCount;
    document.getElementById('consider-count').textContent = considerCount;
    document.getElementById('must-watch-count').textContent = mustWatchCount;
    document.getElementById('episode-counts').style.display = 'flex';
}

let currentTableSort = { column: 'episode', ascending: true };
let currentTableData = [];

function createMustWatchTable(episodes) {
    // Filter out episode 0 and episodes without ratings, then get must-watch episodes
    currentTableData = episodes
        .filter(ep => ep.episode > 0 && ep.rating > 0 && ep.rating >= mustWatchThreshold);
    
    if (currentTableData.length === 0) {
        document.getElementById('must-watch-table-container').style.display = 'none';
        return;
    }
    
    // Update count in title
    document.getElementById('must-watch-count-title').textContent = currentTableData.length;
    
    // Sort by default (season order)
    sortTableData('season', true);
    renderTable();
    setupTableSorting();
    
    document.getElementById('must-watch-table-container').style.display = 'block';
}

function sortTableData(column, ascending) {
    currentTableSort = { column, ascending };
    
    currentTableData.sort((a, b) => {
        let aVal, bVal;
        
        switch(column) {
            case 'season':
                // Sort by season first, then episode
                aVal = a.season * 1000 + a.episode;
                bVal = b.season * 1000 + b.episode;
                break;
            case 'episode':
                // Sort by episode first, then season
                aVal = a.episode * 1000 + a.season;
                bVal = b.episode * 1000 + b.season;
                break;
            case 'title':
                aVal = a.title.toLowerCase();
                bVal = b.title.toLowerCase();
                break;
            case 'rating':
                aVal = a.rating;
                bVal = b.rating;
                break;
            case 'votes':
                aVal = a.votes;
                bVal = b.votes;
                break;
            default:
                return 0;
        }
        
        if (aVal < bVal) return ascending ? -1 : 1;
        if (aVal > bVal) return ascending ? 1 : -1;
        return 0;
    });
}

function renderTable() {
    const tbody = document.getElementById('must-watch-tbody');
    tbody.innerHTML = '';
    
    currentTableData.forEach(ep => {
        const row = document.createElement('tr');
        
        // Add alternating background for different seasons
        if (ep.season % 2 === 0) {
            row.classList.add('season-even');
        }
        
        row.innerHTML = `
            <td class="season-number">${ep.season}</td>
            <td class="episode-number">${ep.episode}</td>
            <td class="episode-title">${ep.title}</td>
            <td class="episode-rating">${ep.rating.toFixed(1)}</td>
            <td class="episode-votes">${ep.votes.toLocaleString()} votes</td>
            <td><a href="${ep.imdbLink}" target="_blank" class="imdb-link">IMDb</a></td>
        `;
        
        tbody.appendChild(row);
    });
    
    // Update sort indicators
    document.querySelectorAll('#must-watch-table th.sortable').forEach(th => {
        th.classList.remove('active');
        const indicator = th.querySelector('.sort-indicator');
        indicator.textContent = '';
    });
    
    const activeHeader = document.querySelector(`#must-watch-table th[data-sort="${currentTableSort.column}"]`);
    if (activeHeader) {
        activeHeader.classList.add('active');
        const indicator = activeHeader.querySelector('.sort-indicator');
        indicator.textContent = currentTableSort.ascending ? '▲' : '▼';
    }
}

function setupTableSorting() {
    // Remove existing listeners to avoid duplicates
    const headers = document.querySelectorAll('#must-watch-table th.sortable');
    headers.forEach(th => {
        const newTh = th.cloneNode(true);
        th.parentNode.replaceChild(newTh, th);
    });
    
    // Add new listeners
    document.querySelectorAll('#must-watch-table th.sortable').forEach(th => {
        th.addEventListener('click', () => {
            const column = th.dataset.sort;
            const ascending = currentTableSort.column === column ? !currentTableSort.ascending : true;
            sortTableData(column, ascending);
            renderTable();
        });
    });
}
