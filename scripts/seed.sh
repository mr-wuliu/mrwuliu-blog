#!/bin/bash
set -e

DB_NAME="blog-db"

echo "Generating seed SQL..."

SQL_FILE=$(mktemp)

cat > "$SQL_FILE" << 'HEADER'
DELETE FROM post_tags;
DELETE FROM comments;
DELETE FROM posts;
HEADER

for i in $(seq 1 20); do
  ID=$(cat /proc/sys/kernel/random/uuid)
  SLUG="test-post-$(printf '%03d' $i)"

  case $((i % 5)) in
    0) TITLE="测试文章 $(printf '%03d' $i)：探索技术的边界与可能性" ;;
    1) TITLE="测试文章 $(printf '%03d' $i)：从零开始学习现代 Web 开发" ;;
    2) TITLE="测试文章 $(printf '%03d' $i)：深入理解分布式系统设计" ;;
    3) TITLE="测试文章 $(printf '%03d' $i)：高效编程的实践与思考" ;;
    4) TITLE="测试文章 $(printf '%03d' $i)：构建可扩展的应用架构" ;;
  esac

  EXCERPT="这是第 ${i} 篇测试文章，用于验证博客分页功能。"

  CONTENT="这是第 ${i} 篇测试文章的正文内容。技术选型是项目成功的关键因素之一。代码质量不仅体现在功能实现上，更体现在可维护性和可扩展性上。"

  DAY=$i
  PUBLISHED_AT="2026-03-$(printf '%02d' $((31 - DAY)))T$(printf '%02d' $((10 + i % 12))):$(printf '%02d' $((i * 3 % 60))):00Z"

  echo "INSERT INTO posts (id, title, slug, content, excerpt, status, published_at, created_at, updated_at) VALUES ('${ID}', '${TITLE}', '${SLUG}', '${CONTENT}', '${EXCERPT}', 'published', '${PUBLISHED_AT}', '${PUBLISHED_AT}', '${PUBLISHED_AT}');" >> "$SQL_FILE"

  echo "  Post ${i}/20: ${TITLE}"
done

echo ""
echo "Executing seed SQL against local D1..."
npx wrangler d1 execute "$DB_NAME" --local --file "$SQL_FILE"

rm "$SQL_FILE"

echo ""
echo "Done! 20 test posts seeded."
