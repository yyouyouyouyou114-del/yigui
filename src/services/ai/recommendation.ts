import { Clothing, Season, Occasion } from '@/types';
import { areColorsHarmonious, getCurrentSeason } from '@/utils/helpers';

/**
 * 智能推荐引擎（基于规则）
 */

export interface RecommendationResult {
  items: Clothing[];
  reason: string;
  score: number;
}

export class RecommendationEngine {
  /**
   * 推荐适合当前季节的衣物
   */
  recommendBySeason(
    allClothing: Clothing[],
    season: Season = getCurrentSeason()
  ): RecommendationResult[] {
    const seasonalItems = allClothing.filter((item) =>
      item.season.includes(season)
    );

    return [
      {
        items: seasonalItems.slice(0, 10),
        reason: `适合${this.getSeasonName(season)}穿着`,
        score: 0.9,
      },
    ];
  }

  /**
   * 推荐搭配
   */
  recommendOutfit(
    baseItem: Clothing,
    allClothing: Clothing[]
  ): RecommendationResult[] {
    const results: RecommendationResult[] = [];

    // 根据基础单品的类别推荐其他类别
    const targetCategories = this.getComplementaryCategories(baseItem.category);

    for (const targetCategory of targetCategories) {
      const candidates = allClothing.filter(
        (item) =>
          item.id !== baseItem.id &&
          item.category === targetCategory &&
          // 季节匹配
          item.season.some((s) => baseItem.season.includes(s))
      );

      // 按颜色协调度排序
      const scored = candidates
        .map((item) => ({
          item,
          score: this.calculateMatchScore(baseItem, item),
        }))
        .filter((x) => x.score > 0.5)
        .sort((a, b) => b.score - a.score);

      if (scored.length > 0) {
        results.push({
          items: scored.slice(0, 5).map((x) => x.item),
          reason: `与"${baseItem.name}"的颜色和风格相配`,
          score: scored[0].score,
        });
      }
    }

    return results;
  }

  /**
   * 根据场合推荐
   */
  recommendByOccasion(
    allClothing: Clothing[],
    occasion: Occasion
  ): RecommendationResult[] {
    const occasionTags: Record<Occasion, string[]> = {
      casual: ['休闲', '日常', '舒适'],
      work: ['正式', '职业', '商务'],
      formal: ['正式', '礼服', '晚宴'],
      sport: ['运动', '健身', '舒适'],
      party: ['派对', '时尚', '个性'],
      outdoor: ['户外', '防风', '舒适'],
    };

    const tags = occasionTags[occasion];
    const matchedItems = allClothing.filter((item) =>
      tags.some((tag) => item.tags.includes(tag))
    );

    return [
      {
        items: matchedItems.slice(0, 10),
        reason: `适合${this.getOccasionName(occasion)}场合`,
        score: 0.85,
      },
    ];
  }

  /**
   * 推荐不常穿的衣物
   */
  recommendUnderutilized(allClothing: Clothing[]): RecommendationResult {
    const sorted = [...allClothing]
      .filter((item) => item.wearCount !== undefined)
      .sort((a, b) => (a.wearCount || 0) - (b.wearCount || 0));

    return {
      items: sorted.slice(0, 10),
      reason: '这些衣物很少穿，不妨试试看',
      score: 0.7,
    };
  }

  /**
   * 计算两件衣物的匹配度
   */
  private calculateMatchScore(item1: Clothing, item2: Clothing): number {
    let score = 0.5; // 基础分

    // 颜色协调 +0.3
    if (areColorsHarmonious(item1.color, item2.color)) {
      score += 0.3;
    }

    // 季节匹配 +0.2
    if (item1.season.some((s) => item2.season.includes(s))) {
      score += 0.2;
    }

    // 标签相似度
    const commonTags = item1.tags.filter((tag) => item2.tags.includes(tag));
    if (commonTags.length > 0) {
      score += Math.min(0.2, commonTags.length * 0.1);
    }

    return Math.min(1, score);
  }

  /**
   * 获取互补的衣物类别
   */
  private getComplementaryCategories(category: Clothing['category']): Clothing['category'][] {
    const map: Record<Clothing['category'], Clothing['category'][]> = {
      top: ['bottom', 'shoes', 'accessory'],
      bottom: ['top', 'shoes', 'accessory'],
      dress: ['outerwear', 'shoes', 'accessory'],
      outerwear: ['top', 'bottom', 'shoes'],
      shoes: ['top', 'bottom', 'dress'],
      accessory: ['top', 'bottom', 'dress'],
    };
    return map[category] || [];
  }

  private getSeasonName(season: Season): string {
    const names: Record<Season, string> = {
      spring: '春季',
      summer: '夏季',
      autumn: '秋季',
      winter: '冬季',
    };
    return names[season];
  }

  private getOccasionName(occasion: Occasion): string {
    const names: Record<Occasion, string> = {
      casual: '休闲',
      work: '工作',
      formal: '正式',
      sport: '运动',
      party: '派对',
      outdoor: '户外',
    };
    return names[occasion];
  }
}

// 单例
export const recommendationEngine = new RecommendationEngine();

