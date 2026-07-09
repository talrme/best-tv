# 📺 Best TV Shows

**[🌐 View Live Website](https://talrme.github.io/best-tv/)**

**To add new shows:** [Google Colab notebook](https://colab.research.google.com/drive/1Bxuls9Ig4wuxerzQfcHJ0wRcz59XolU2#scrollTo=KsqTdDj--irx)

An interactive web application that visualizes TV show episode ratings using dynamic heatmaps. Explore your favorite shows and discover which episodes are must-watch!

## ✨ Features

### 🎨 Interactive Heatmap
- Clean, professional grid layout with labeled Season and Episode axes
- Visual representation of episode ratings across all seasons
- Color-coded cells: Green (Must Watch), Yellow (Consider), Red (Skip)
- Smart grid alignment that handles seasons with varying episode counts
- Hover over any episode to see detailed information including title, rating, and votes
- Smooth animations when loading new shows
- Click any cell to open the episode on IMDb

### 🔍 Smart Search
- Loads with Community by default for immediate exploration
- Searchable dropdown with autocomplete
- Browse through an extensive collection of TV shows
- Quick clear button to reset your selection

### 🎚️ Customizable Thresholds
- Dual-range slider to set your own rating thresholds
- Adjust what qualifies as "Must Watch" vs "Consider" vs "Skip"
- Real-time heatmap updates as you adjust the sliders
- Episode counts for each category

### 📊 Must Watch Episodes Table
- Sortable table showing only the highest-rated episodes
- Sort by Season, Episode, Title, Rating, or Votes
- Alternating row colors for easy reading
- Direct links to IMDb for each episode
- Shareable URLs with your custom threshold settings

### 🔗 Shareable Links
- URL parameters preserve your show selection and threshold settings
- Share your custom views with friends

## 🚀 How to Use

1. **View Default Show**: Community loads automatically when you first visit
2. **Select a Different Show**: Click the dropdown or start typing to search for any TV show
3. **View the Heatmap**: See all episodes color-coded by rating in an intuitive grid layout
4. **Adjust Thresholds**: Use the dual slider to customize rating categories
5. **Explore Episodes**: Check out the Must Watch Episodes table below
6. **Share**: Copy the URL to share your view with custom settings

## 🛠️ Technologies Used

- **HTML5** - Structure and semantics
- **CSS3** - Modern styling with animations and responsive design
- **Vanilla JavaScript** - No frameworks, pure JS for performance
- **Google Sheets API** - Data source via CSV export

## 📦 Data Source

Episode data is fetched from a public Google Spreadsheet containing:
- Show names
- Season and episode numbers
- Episode titles
- IMDb ratings and vote counts
- Direct IMDb links

## 🎯 Key Highlights

- **No Dependencies**: Built with vanilla JavaScript for fast loading
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Modern UI**: Clean, professional interface with custom banner and smooth animations
- **Intuitive Layout**: Clear Season/Episode labeling with smart grid alignment
- **Performance Optimized**: Efficient rendering even for shows with 100+ episodes
- **Accessibility**: Keyboard navigation and ARIA labels
- **Data Accuracy**: Automatically filters out episodes with missing ratings

## 📱 Responsive Design

The application adapts beautifully to different screen sizes:
- Desktop: Full-width heatmap with detailed table
- Tablet: Optimized layout for medium screens
- Mobile: Stacked layout with touch-friendly controls

## 🌟 Perfect For

- TV enthusiasts looking to discover the best episodes
- Binge-watchers who want to skip filler episodes
- Data visualization enthusiasts
- Anyone planning their next TV show marathon

## 📄 License

This project is open source and available for personal and educational use.

## 🤝 Contributing

Feel free to fork this repository and submit pull requests with improvements!

---

Made with ❤️ for TV lovers everywhere





