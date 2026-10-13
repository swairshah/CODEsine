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
    preferYouTube: true, // use YouTube sources whenever the page can
    musicLevel: 0.55, // background music volume, 0 to 1
    biteLevel: 0.95, // sound bite volume
    duck: 0.3, // music level while a bite plays, as a fraction of musicLevel
    biteDelay: 0.6, // seconds you must rest on a machine before its bite starts
    biteFadeIn: 0.4, // seconds
    biteFadeOut: 2.5, // seconds, at the end of a bite or after biteMax
    biteMax: 20, // a bite longer than this fades out after this many seconds
    leaveFadeOut: 0.6, // seconds to fade a bite when you scroll away

    stages: [
      {
        name: 'Apple I',
        bite: [yt('dz4aiU4FiIM', 0, 30, 'Steve Wozniak remembers building the first Apple', 'Steve Wozniak on building the Apple I', 'FORA.tv'), voice('00', 'Byte into an Apple.', 'Apple Computer advert, 1976', 'terminal')],
        music: [yt('kSIMVnPA994', 0, null, 'Jean-Michel Jarre, Oxygène, Pt. 4'), synth('kit')],
      },
      {
        name: 'Apple II',
        bite: [yt('UL7urMIB0G0', 4, 32, 'Introducing Apple II, 1977 TV spot', 'Introducing Apple II, the easy to operate home computer.', 'Apple II TV spot, 1977'), voice('01', 'Introducing Apple II. The home computer that’s ready to work, play and grow with you.', 'Apple II advert, 1977', 'apple2')],
        music: [yt('yEbaeLv-aOo', 0, null, 'Donna Summer, I Feel Love'), synth('chip')],
      },
      {
        name: 'Macintosh 128K',
        bite: [yt('h9xUAEJSXyQ', 1, 37, 'The Macintosh speaks at its launch', 'Hello. I’m Macintosh. It sure is great to get out of that bag.', 'Macintosh launch, 1984'), voice('02', 'Hello. I’m Macintosh. It sure is great to get out of that bag.', 'Macintosh speaking at its launch, 1984', 'mac')],
        music: [yt('8a-HfNE3EIo', 0, null, 'Vangelis, Chariots of Fire'), synth('synth84')],
      },
      {
        name: 'PowerBook 100',
        bite: [yt('PVFTxP5Nne0', 0, 31, 'What’s on your PowerBook? Teacher, 1992', 'I don’t want to be a critic. I want to be a builder.', 'PowerBook advert, 1992'), voice('03', 'What’s on your PowerBook?', 'PowerBook advertising, 1992', 'chime')],
        music: [yt('hTWKbfoikeg', 0, null, 'Nirvana, Smells Like Teen Spirit'), synth('fm91')],
      },
      {
        name: 'iMac G3',
        bite: [yt('0BHPtoTctDY', 327, 345, 'Steve Jobs introduces the iMac', 'This is iMac. The whole thing is translucent, you can see into it.', 'iMac launch, 1998'), voice('04', 'Say hello to iMac.', 'iMac advertising, 1998', 'imac')],
        music: [yt('Va87qt0VZ2M', 0, null, 'The Rolling Stones, She’s a Rainbow'), synth('trip98')],
      },
      {
        name: 'iPod',
        bite: [yt('kN0SVBCJqLs', 529, 553, 'The first iPod introduction', 'This amazing little device holds a thousand songs, and it goes right in my pocket.', 'iPod launch, 2001'), voice('05', '1,000 songs in your pocket.', 'iPod launch, 2001', 'wheel')],
        music: [yt('81bG15gsl70', 0, null, 'Propellerheads, Take California'), synth('bigbeat01')],
      },
      {
        name: 'iPhone',
        bite: [yt('MnrJzXM7a6o', 132, 178, 'Steve Jobs introduces iPhone', 'An iPod, a phone and an internet communicator. Are you getting it?', 'iPhone launch, 2007'), voice('06', 'An iPod, a phone and an internet communicator.', 'iPhone launch, 2007', 'unlock')],
        music: [yt('ABYnqp-bxvg', 0, null, 'Feist, 1234'), synth('indie07')],
      },
      {
        name: 'MacBook Air',
        bite: [yt('OIV6peKMj9M', 196, 235, 'Macworld 2008, the MacBook Air introduction', 'This is the new MacBook Air. Yeah, there it is.', 'MacBook Air launch, 2008'), voice('07', 'The world’s thinnest notebook.', 'MacBook Air launch, 2008', 'envelope')],
        music: [yt('hhE7QMXRE1g', 0, null, 'Yael Naim, New Soul'), synth('folk08')],
      },
      {
        name: 'MacBook Air (M1)',
        bite: [yt('5AwdkGKmZ0I', 148, 157, 'Apple Event, 10 November 2020', 'But there is just one more thing. It’s time to talk about the Mac.', 'Apple Event, November 2020'), voice('08', 'One more thing.', 'Apple silicon Mac event, 2020', 'lid')],
        music: [yt('R0vu5QfsD5E', 0, null, 'Tones and I, Fly Away'), synth('ambient20')],
      },
      {
        name: 'Apple M1',
        bite: [yt('5AwdkGKmZ0I', 492, 501, 'Apple Event, 10 November 2020', 'M1 has a massive 16 billion transistors.', 'Apple Event, November 2020'), voice('09', '16 billion transistors.', 'M1 introduction, 2020', 'shimmer')],
        music: [yt('TUVcZfQe-Kw', 0, null, 'Dua Lipa, Levitating'), synth('pulse20')],
      },
      {
        name: 'iMac 24″',
        bite: [yt('JdBYVNuky1M', 1302, 1340, 'Apple Event, 20 April 2021', 'The all-new, completely redesigned iMac.', 'Apple Event, April 2021'), voice('10', 'Hello. In seven vibrant colours.', 'iMac introduction, 2021', 'hello')],
        music: [yt('hjcXNK-zUFg', 0, null, 'Lizzo, Better in Color'), synth('pop21')],
      },
      {
        name: 'MacBook Pro 14″',
        bite: [yt('exM1uajp--A', 1999, 2031, 'Apple Event, 18 October 2021', 'And yes, MagSafe is coming back to the MacBook Pro.', 'Apple Event, October 2021'), voice('11', 'MagSafe is back.', 'MacBook Pro introduction, 2021', 'magsafe')],
        music: [yt('G_7NMz9Ln8E', 0, null, 'Rezz and Deathpact, Chemical Bond'), synth('deep21')],
      },
      {
        name: 'Mac mini',
        bite: [yt('Q9Npd8h6CWM', 0, 30, 'M4 Mac mini revealed', 'The new Mac mini is just 5 by 5 inches.', 'Mac mini introduction, 2024'), voice('12', 'Five by five inches.', 'Mac mini introduction, 2024', 'mini')],
        music: [yt('ekr2nIex040', 0, null, 'ROSÉ and Bruno Mars, APT.'), synth('minimal24')],
      },
    ],
  };
})(window);
