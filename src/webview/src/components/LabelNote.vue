<script>
import NoteBody from './NoteBody';
import UserAvatar from './UserAvatar';
import icons from '../assets/icons';
import Date from './Date';

export default {
  props: {
    noteable: {
      type: Object,
      required: true,
    },
  },
  components: {
    NoteBody,
    UserAvatar,
    Date,
  },
  computed: {
    author() {
      return this.noteable.user;
    },
    note() {
      if(this.noteable.body === '') {
        const action = this.noteable.action == 'add' ? 'added': 'removed';
        this.noteable.body = action + ' ~' + this.noteable.label.name + ' label';
      }
      return this.noteable;
    }
  },
  created() {
    this.icon = icons.label;
  },
};
</script>

<template>
  <li class="note label-note">
    <div class="timeline-entry-inner">
      <div class="timelineIcon">
        <span class="avatar" v-html="icon"></span>
      </div>
      <div class="timelineContent">
        <div class="note-header">
          <user-avatar :user="author" :show-avatar="false" style="margin-right: 2px;" /> <note-body :note="note" style="margin-right: 2px;" /> · <date :date="noteable.created_at"  style="margin-left: 2px;" />
        </div>
      </div>
    </div>
  </li>
</template>

<style lang="scss">
.label-note {
  border: none;
  padding-bottom:4px;
  padding-left:20px;
  padding-right:20px;
  padding-top:4px;
  position: static;

  &:last-child {
    position: relative;
  }

  .timelineContent {
    margin-left: 30px;
  }

  .timelineIcon {
    border: 1px solid;
    border-color: var(--vscode-panel-border);
    background: var(--vscode-editor-background);
    display: flex;
    width: 32px;
    height: 32px;
    border-radius: 32px;
    float: left;
    margin-right: 20px;
    margin-top: -6px;

    svg {
      width: 16px;
      height: 16px;
      margin: 7px;
      overflow-x: hidden;
      overflow-y: hidden;
      display: block;
    }
  }

  ul {
    list-style-type: disc;
    padding-inline-start: 16px;
  }
}
</style>
