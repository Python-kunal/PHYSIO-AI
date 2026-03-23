import re
from collections import Counter

# Read the poem file
with open('poem.txt', 'r') as file:
    poem = file.read()

# Convert to lowercase and extract words (removing punctuation)
words = re.findall(r'\b[a-z]+\b', poem.lower())

# Count word frequencies
word_freq = Counter(words)

# Find maximum occurrence
max_count = max(word_freq.values())

# Find all words with maximum occurrence
max_words = [word for word, count in word_freq.items() if count == max_count]

# Display results
print(f"Total unique words: {len(word_freq)}")
print(f"Maximum occurrence count: {max_count}")
print(f"\nWords with maximum occurrence ({max_count} times):")
for word in sorted(max_words):
    print(f"  - '{word}'")

# Display top 10 most frequent words
print("\nTop 10 most frequent words:")
for word, count in word_freq.most_common(10):
    print(f"  '{word}': {count}")
