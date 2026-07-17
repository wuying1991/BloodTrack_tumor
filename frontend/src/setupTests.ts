import '@testing-library/jest-dom';
import i18n from './i18n';

// jsdom 的 navigator.language 默认 en-US，会让 detectLanguage 误判为英文。
// 测试统一以 zh-CN 运行（既有中文文本选择器依赖中文渲染）。
i18n.changeLanguage('zh-CN');
