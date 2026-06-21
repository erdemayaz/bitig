import * as fs from 'fs';
import { MemoryManager } from '../src/MemoryManager';

jest.mock('fs');

describe('MemoryManager', () => {
  const memoryPath = './memory.json';
  let manager: MemoryManager;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize empty memory if file does not exist', () => {
    (fs.existsSync as jest.Mock).mockReturnValue(false);
    manager = new MemoryManager(memoryPath);

    expect(manager.data).toEqual({
      global: { feedback: [], style: [], routines: [] },
      sections: {},
      chapters: {}
    });
  });

  it('should load memory from file if it exists', () => {
    const fakeData = {
      global: {
        feedback: ['Do not commit without permission'],
        style: ['Write math in italics'],
        routines: ['Run check before build']
      },
      sections: {
        '1': {
          feedback: [],
          style: ['Section style'],
          routines: []
        }
      },
      chapters: {
        '1.3': {
          feedback: ['Correct the formula'],
          style: [],
          routines: []
        }
      }
    };

    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(fakeData));

    manager = new MemoryManager(memoryPath);

    expect(manager.data.global.feedback).toContain('Do not commit without permission');
    expect(manager.data.sections['1'].style).toContain('Section style');
    expect(manager.data.chapters['1.3'].feedback).toContain('Correct the formula');
  });

  it('should append items during learn() and save', () => {
    (fs.existsSync as jest.Mock).mockReturnValue(false);
    manager = new MemoryManager(memoryPath);

    manager.learn('global', {
      feedback: 'Global feedback',
      style: 'Global style',
      routine: 'Global routine'
    });
    manager.learn('1', { style: 'Section 1 style' });
    manager.learn('1.3', { feedback: 'Chapter 1.3 feedback' });

    expect(manager.data.global.feedback).toContain('Global feedback');
    expect(manager.data.global.style).toContain('Global style');
    expect(manager.data.global.routines).toContain('Global routine');
    expect(manager.data.sections['1'].style).toContain('Section 1 style');
    expect(manager.data.chapters['1.3'].feedback).toContain('Chapter 1.3 feedback');

    expect(fs.writeFileSync).toHaveBeenCalled();
  });

  it('should clear specified scopes', () => {
    const fakeData = {
      global: {
        feedback: ['feedback1'],
        style: ['style1'],
        routines: ['routine1']
      },
      sections: {
        '1': {
          feedback: ['secfeedback'],
          style: ['secstyle'],
          routines: ['secroutine']
        }
      },
      chapters: {
        '1.3': {
          feedback: ['chapfeedback'],
          style: ['chapstyle'],
          routines: ['chaproutine']
        }
      }
    };

    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(fakeData));

    manager = new MemoryManager(memoryPath);

    // Clear chapter scope
    manager.clear('1.3');
    expect(manager.data.chapters['1.3']).toBeUndefined();

    // Clear section scope
    manager.clear('1');
    expect(manager.data.sections['1']).toBeUndefined();

    // Clear global scope
    manager.clear('global');
    expect(manager.data.global).toEqual({ feedback: [], style: [], routines: [] });

    expect(fs.writeFileSync).toHaveBeenCalledTimes(3);
  });

  it('should format memory correctly for markdown in Turkish', () => {
    const fakeData = {
      global: {
        feedback: ['Geri bildirim global'],
        style: ['Stil global'],
        routines: ['Rutin global']
      },
      sections: {
        '1': {
          feedback: [],
          style: ['Stil section 1'],
          routines: []
        }
      },
      chapters: {
        '1.3': {
          feedback: ['Geri bildirim chapter 1.3'],
          style: [],
          routines: []
        }
      }
    };

    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(fakeData));

    manager = new MemoryManager(memoryPath);

    const formatted = manager.getFormattedMemory(
      { sectionNum: 1, chapterNum: 3 },
      ['global', 'section', 'chapter'],
      'tr'
    );

    expect(formatted).toContain('## 🧠 PERSISTENT AGENT MEMORY & FEEDBACK HISTORY');
    expect(formatted).toContain('Küresel / Proje Geneli Bellek:');
    expect(formatted).toContain('Geri bildirim global');
    expect(formatted).toContain('Stil global');
    expect(formatted).toContain('Rutin global');
    expect(formatted).toContain('Bölüm Grubu 1 Belleği:');
    expect(formatted).toContain('Stil section 1');
    expect(formatted).toContain('Bölüm 1.3 Belleği:');
    expect(formatted).toContain('Geri bildirim chapter 1.3');
  });

  it('should format memory correctly for markdown in English', () => {
    const fakeData = {
      global: {
        feedback: ['Feedback global'],
        style: ['Style global'],
        routines: ['Routine global']
      },
      sections: {
        '1': {
          feedback: [],
          style: ['Style section 1'],
          routines: []
        }
      },
      chapters: {
        '1.3': {
          feedback: ['Feedback chapter 1.3'],
          style: [],
          routines: []
        }
      }
    };

    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(fakeData));

    manager = new MemoryManager(memoryPath);

    const formatted = manager.getFormattedMemory(
      { sectionNum: 1, chapterNum: 3 },
      ['global', 'section', 'chapter'],
      'en'
    );

    expect(formatted).toContain('## 🧠 PERSISTENT AGENT MEMORY & FEEDBACK HISTORY');
    expect(formatted).toContain('Global / Project-Level Memory:');
    expect(formatted).toContain('Feedback global');
    expect(formatted).toContain('Style global');
    expect(formatted).toContain('Routine global');
    expect(formatted).toContain('Section 1 Memory:');
    expect(formatted).toContain('Style section 1');
    expect(formatted).toContain('Chapter 1.3 Memory:');
    expect(formatted).toContain('Feedback chapter 1.3');
  });

  it('should selectively format memory layers', () => {
    const fakeData = {
      global: {
        feedback: ['Feedback global'],
        style: [],
        routines: []
      },
      sections: {
        '1': {
          feedback: [],
          style: ['Style section 1'],
          routines: []
        }
      },
      chapters: {
        '1.3': {
          feedback: ['Feedback chapter 1.3'],
          style: [],
          routines: []
        }
      }
    };

    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(fakeData));

    manager = new MemoryManager(memoryPath);

    const formatted = manager.getFormattedMemory(
      { sectionNum: 1, chapterNum: 3 },
      ['global', 'chapter'],
      'en'
    );

    expect(formatted).toContain('Global / Project-Level Memory:');
    expect(formatted).not.toContain('Section 1 Memory:');
    expect(formatted).toContain('Chapter 1.3 Memory:');
  });

  it('should handle empty file content during load', () => {
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readFileSync as jest.Mock).mockReturnValue('   ');
    manager = new MemoryManager(memoryPath);
    expect(manager.data).toEqual({
      global: { feedback: [], style: [], routines: [] },
      sections: {},
      chapters: {}
    });
  });

  it('should fallback to empty memory when parsing fails', () => {
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readFileSync as jest.Mock).mockReturnValue('invalid-json{');
    const spy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    manager = new MemoryManager(memoryPath);
    expect(manager.data).toEqual({
      global: { feedback: [], style: [], routines: [] },
      sections: {},
      chapters: {}
    });
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('should parse prefixes section: and chapter:', () => {
    (fs.existsSync as jest.Mock).mockReturnValue(false);
    manager = new MemoryManager(memoryPath);

    manager.learn('section:2', { style: 'sec-style' });
    manager.learn('chapter:2.1', { feedback: 'chap-feedback' });

    expect(manager.data.sections['2'].style).toContain('sec-style');
    expect(manager.data.chapters['2.1'].feedback).toContain('chap-feedback');
  });

  it('should return empty string if no memory sections are formatted', () => {
    (fs.existsSync as jest.Mock).mockReturnValue(false);
    manager = new MemoryManager(memoryPath);
    const formatted = manager.getFormattedMemory({ sectionNum: 1, chapterNum: 1 }, ['global']);
    expect(formatted).toBe('');
  });

  it('should handle partial JSON properties on load', () => {
    const partialData = {
      global: {
        feedback: ['globalFeedback'],
        style: [],
        routines: []
      }
    };
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(partialData));

    manager = new MemoryManager(memoryPath);
    expect(manager.data.global.feedback).toContain('globalFeedback');
    expect(manager.data.sections).toEqual({});
    expect(manager.data.chapters).toEqual({});
  });

  it('should handle empty or missing options in learn()', () => {
    (fs.existsSync as jest.Mock).mockReturnValue(false);
    manager = new MemoryManager(memoryPath);

    manager.learn('global', {});
    expect(manager.data.global).toEqual({ feedback: [], style: [], routines: [] });

    manager.learn('global', { feedback: '  ', style: '  ', routine: '  ' });
    expect(manager.data.global).toEqual({ feedback: [], style: [], routines: [] });
  });

  it('should handle formatting for empty sections/chapters or deactivated layers', () => {
    const fakeData = {
      global: { feedback: [], style: [], routines: [] },
      sections: {
        '1': { feedback: [], style: [], routines: [] }
      },
      chapters: {
        '1.1': { feedback: [], style: [], routines: [] }
      }
    };
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(fakeData));

    manager = new MemoryManager(memoryPath);
    const formatted = manager.getFormattedMemory({ sectionNum: 1, chapterNum: 1 }, [
      'global',
      'section',
      'chapter'
    ]);
    expect(formatted).toBe('');
  });

  it('should throw on invalid scope', () => {
    (fs.existsSync as jest.Mock).mockReturnValue(false);
    manager = new MemoryManager(memoryPath);

    expect(() => manager.learn('invalid:scope', { style: 'style' })).toThrow(
      'Invalid memory scope'
    );
  });
});
