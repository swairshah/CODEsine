// soundtrack.js: what plays at each stage. Edit this file to change the sounds.
//
// Each stage has a `bite` (a short clip played once when you arrive) and a `music` track (plays
// while you are at that machine and crossfades into the next machine's as you scroll). Both are
// lists in order of preference; the first source that can play is used:
//
//   yt(id, start, end, title, line, source)   a YouTube video between two times in seconds. Plays in a
//                                              small visible player, and only when the page is served
//                                              over http(s); see serve.sh.
//   file(src, { start, end, line, source, sfx })   an audio file in this folder.
//   synth(song)                               an original music bed made in the browser (a placeholder).
//
// `end` may be left out to play to the end (music then loops from `start`). `line` and `source` are
// shown as a subtitle while a bite plays.
'use strict';

(function (global) {
  const yt = (id, start, end, title, line, source) => ({ kind: 'youtube', id, start, end, title, line, source });
  const file = (src, o = {}) => ({ kind: 'file', src, ...o });
  const synth = (song) => ({ kind: 'synth', song });
  const voice = (n, line, source, sfx) => file(`audio/voice/${n}.mp3`, { line, source, sfx });

  global.SOUNDTRACK = {
    useCustom: true, // local recordings in audio/custom/; false restores the placeholders
    preferYouTube: false, // opt in to visible YouTube players as a fallback over http(s)
    musicLevel: 0.55, // background music volume, 0 to 1
    biteLevel: 0.95, // sound bite volume
    duck: 0.3, // music level while a bite plays, as a fraction of musicLevel
    biteDelay: 0.6, // seconds you must rest on a machine before its bite starts
    biteFadeIn: 0.06, // seconds; keep the opening words audible
    biteFadeOut: 0.25, // seconds; fade the tail, not the final sentence
    biteMax: 20, // a bite longer than this fades out after this many seconds
    leaveFadeOut: 0.6, // seconds to fade a bite when you scroll away

    stages: [
      {
        name: 'Apple I',
        bite: [yt('dz4aiU4FiIM', 11.1, 24.5, 'Steve Wozniak remembers building the first Apple', 'Why don’t I make this little microprocessor chip my own local computer?', 'Steve Wozniak on the Apple I · FORA.tv'), voice('00', 'Byte into an Apple.', 'Apple Computer advert, 1976', 'terminal')],
        music: [yt('xFrGuyw1V8s', 0, null, 'ABBA, Dancing Queen'), synth('kit')],
      },
      {
        name: 'Apple II',
        bite: [yt('UL7urMIB0G0', 4, 11.3, 'Introducing Apple II, 1977 TV spot', 'Introducing Apple II, the easy to operate home computer.', 'High Technology store advert, 1977'), voice('01', 'Introducing Apple II. The home computer that’s ready to work, play and grow with you.', 'Apple II advert, 1977', 'apple2')],
        music: [yt('fNFzfwLM72c', 0, null, 'Bee Gees, Stayin’ Alive'), synth('chip')],
      },
      {
        name: 'Macintosh 128K',
        bite: [yt('h9xUAEJSXyQ', 1, 8.2, 'The Macintosh speaks at its launch', 'Hello. I’m Macintosh. It sure is great to get out of that bag.', 'Macintosh launch, 1984'), voice('02', 'Hello. I’m Macintosh. It sure is great to get out of that bag.', 'Macintosh speaking at its launch, 1984', 'mac')],
        music: [yt('8a-HfNE3EIo', 0, null, 'Vangelis, Chariots of Fire'), synth('synth84')],
      },
      {
        name: 'PowerBook 100',
        bite: [yt('PVFTxP5Nne0', 1.65, 7.5, 'What’s on your PowerBook? Teacher, 1992', 'I don’t want to be a critic. I want to be a builder.', 'PowerBook advert, 1992'), voice('03', 'What’s on your PowerBook?', 'PowerBook advertising, 1992', 'chime')],
        music: [yt('Mr_uHJPUlO8', 0, null, 'Red Hot Chili Peppers, Give It Away'), synth('fm91')],
      },
      {
        name: 'iMac G3',
        bite: [yt('0BHPtoTctDY', 327, 332.65, 'Steve Jobs introduces the iMac', 'This is iMac. The whole thing is translucent, you can see into it.', 'iMac launch, 1998'), voice('04', 'Say hello to iMac.', 'iMac advertising, 1998', 'imac')],
        music: [yt('Va87qt0VZ2M', 0, null, 'The Rolling Stones, She’s a Rainbow'), synth('trip98')],
      },
      {
        name: 'iPod',
        bite: [yt('kN0SVBCJqLs', 545.05, 551.85, 'The first iPod introduction', 'This amazing little device holds a thousand songs, and it goes right in my pocket.', 'iPod launch, 2001'), voice('05', '1,000 songs in your pocket.', 'iPod launch, 2001', 'wheel')],
        music: [yt('tuK6n2Lkza0', 0, null, 'Jet, Are You Gonna Be My Girl'), synth('bigbeat01')],
      },
      {
        name: 'iPhone',
        bite: [yt('MnrJzXM7a6o', 162.95, 178, 'Steve Jobs introduces iPhone', 'These are not three separate devices. This is one device, and we are calling it iPhone.', 'iPhone launch, 2007'), voice('06', 'An iPod, a phone and an internet communicator.', 'iPhone launch, 2007', 'unlock')],
        music: [yt('CvBfHwUxHIk', 0, null, 'Rihanna, Umbrella'), synth('indie07')],
      },
      {
        name: 'MacBook Air',
        bite: [yt('OIV6peKMj9M', 224.65, 234.3, 'Macworld 2008, the MacBook Air introduction', 'This is the new MacBook Air. Yeah, there it is.', 'MacBook Air launch, 2008'), voice('07', 'The world’s thinnest notebook.', 'MacBook Air launch, 2008', 'envelope')],
        music: [yt('dvgZkm1xWPE', 0, null, 'Coldplay, Viva la Vida'), synth('folk08')],
      },
      {
        name: 'Apple Watch',
        bite: [yt('38IqQpwPe7s', 3338.5, 3348.5, 'Apple Event, 9 September 2014', 'But we’re not quite finished yet. We have one more thing.', 'Tim Cook introduces Apple Watch, September 2014'), voice('08', 'One more thing.', 'Apple Watch introduction, 2014', 'shimmer')],
        music: [yt('4IACZdwwJI4', 0, null, 'Nina Simone, Sinnerman'), synth('ambient20')],
      },
      {
        name: 'Apple M1',
        bite: [yt('5AwdkGKmZ0I', 377.65, 390, 'Apple Event, 10 November 2020', 'Our first chip designed specifically for the Mac. And we call it M1.', 'Apple Event, November 2020'), voice('09', '16 billion transistors.', 'M1 introduction, 2020', 'shimmer')],
        music: [yt('TUVcZfQe-Kw', 0, null, 'Dua Lipa, Levitating'), synth('pulse20')],
      },
      {
        name: 'iMac 24″',
        bite: [yt('JdBYVNuky1M', 1307.6, 1315.4, 'Apple Event, 20 April 2021', 'The all-new, completely redesigned iMac.', 'Apple Event, April 2021'), voice('10', 'Hello. In seven vibrant colours.', 'iMac introduction, 2021', 'hello')],
        music: [yt('b-mGA4V2LK0', 0, null, 'The Chemical Brothers, The Darkness That You Fear'), synth('pop21')],
      },
      {
        name: 'MacBook Pro 14″',
        bite: [yt('exM1uajp--A', 2021.5, 2025.95, 'Apple Event, 18 October 2021', 'And yes, MagSafe is coming back to the MacBook Pro.', 'Apple Event, October 2021'), voice('11', 'MagSafe is back.', 'MacBook Pro introduction, 2021', 'magsafe')],
        music: [yt('G_7NMz9Ln8E', 0, null, 'Rezz and Deathpact, Chemical Bond'), synth('deep21')],
      },
      {
        name: 'Mac mini',
        bite: [yt('Q9Npd8h6CWM', 21.7, 29.4, 'M4 Mac mini revealed', 'The new mini is just five by five inches.', 'Mac mini introduction, 2024'), voice('12', 'Five by five inches.', 'Mac mini introduction, 2024', 'mini')],
        music: [yt('V9PVRfjEBTI', 0, null, 'Billie Eilish, Birds of a Feather'), synth('minimal24')],
      },
    ],
  };

  // Keep the YouTube references and original voice/synth placeholders intact behind each file.
  // Do not copy the source-video start/end: the local sound bites are already trimmed.
  if (global.SOUNDTRACK.useCustom) {
    global.SOUNDTRACK.stages.forEach((stage, i) => {
      for (const kind of ['bite', 'music']) {
        const { title, line, source } = stage[kind][0];
        stage[kind].unshift(file(`audio/custom/${String(i).padStart(2, '0')}-${kind}.mp3`, { title, line, source }));
      }
    });
  }
})(window);
