<script>
import Note from './Note';
import Discussion from './Discussion';
import SystemNote from './SystemNote';
import LabelNote from './LabelNote';

const hasSingleNote = discussion => discussion.notes && discussion.notes.nodes.length === 1;

export default {
  props: {
    discussions: {
      type: Array,
      required: true,
    },
  },
  components: {
    Note,
    Discussion,
    SystemNote,
    LabelNote,
  },
  methods: {
    getComponentName(discussion) {
      if (hasSingleNote(discussion)) {
        if (discussion.notes.nodes[0].system) {
          return SystemNote;
        }

        return Note;
      }
      if (discussion.label) {
        return LabelNote;
      }

      return Discussion;
    },
    getComponentData(discussion) {
      if (discussion.label) {
        return discussion;
      }
      return hasSingleNote(discussion) ? discussion.notes.nodes[0] : discussion;
    },
  },
};
</script>

<template>
  <ul class="issuable-discussions">
    <component
      v-for="discussion in discussions"
      :key="discussion.id"
      :is="getComponentName(discussion)"
      :noteable="getComponentData(discussion)"
    />
  </ul>
</template>

<style lang="scss">
* {
  box-sizing: border-box;
}

.issuable-discussions {
  position: relative;
  display: block;
  list-style: none;
  margin: 0;
  padding: 0;
  position: relative;
  text-align: left;

  &::before {
    content: '';
    border-left: 2px solid;
    border-color: var(--vscode-panel-border);
    position: absolute;
    left: 36px;
    top: 0px;
    bottom: 0;
    width: 2px;
    box-sizing: border-box;
    z-index: 4px;
  }
}
</style>
